import type { ChatCompletionMessage } from '@/shared/types/backends/chatcompletions';

export interface OutfitAnalyzerParams {
  message: string;
  charName: string;
  currentOutfit: Record<string, string>;
  connectionSettings: {
    apiUrl: string;
    apiKey?: string;
    model: string;
  };
}

export interface OutfitChange {
  slot: string;
  action: 'add' | 'remove' | 'change';
  description: string;
}

export interface OutfitAnalyzerResult {
  changes: OutfitChange[];
  updatedOutfit: Record<string, string>;
}

const OUTFIT_SLOTS = [
  'head', 'face', 'neck',
  'undergarment_top', 'torso_top', 'torso_outer', 'arms', 'hands',
  'undergarment_bottom', 'lower_body', 'legs',
  'socks', 'feet', 'accessories',
];

const ANALYSIS_PROMPT = `You are an outfit tracking assistant. Analyze the following message for clothing changes.

Current outfit:
{currentOutfit}

OUTPUT FORMAT (strict - no other text):
If clothing changes detected, output EACH action on its own line (one action per line):
PUT_ON("item description") SLOT(slot_name)
TAKE_OFF("item description") SLOT(slot_name)
CHANGE("item description") SLOT(slot_name)

If no clothing changes: NO_CHANGE

MULTIPLE CHANGES EXAMPLE:
Message: "She takes off her jacket and puts on a scarf"
Output:
TAKE_OFF("jacket") SLOT(torso_outer)
PUT_ON("scarf") SLOT(neck)

SLOT RULES:
- head: hats, headbands, tiaras, helmets
- face: glasses, masks, veils
- neck: necklaces, scarves, chokers
- undergarment_top: bras, undershirts, camisoles
- torso_top: shirts, blouses, tunics, dresses (upper part)
- torso_outer: jackets, coats, sweaters, armor
- arms: gloves, bracers, arm warmers
- hands: rings, bracelets
- undergarment_bottom: underwear, boxers
- lower_body: pants, skirts, shorts, kilts
- legs: stockings, leggings, tights
- socks: socks, ankle warmers
- feet: shoes, boots, sandals, heels
- accessories: belts, wings, tails, capes

SINGLE CHANGE EXAMPLES:
Message: "She puts on a leather jacket"
Output: PUT_ON("leather jacket") SLOT(torso_outer)

Message: "He removes his hat"
Output: TAKE_OFF("hat") SLOT(head)

Message: "She changes into a red dress"
Output: CHANGE("red dress") SLOT(torso_top)

Message: "He walks across the room"
Output: NO_CHANGE

Analyze this message and output ONLY the actions:`;

export function parseOutfitChanges(response: string, currentOutfit: Record<string, string>): OutfitAnalyzerResult {
  const lines = response.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const changes: OutfitChange[] = [];
  const updatedOutfit = { ...currentOutfit };
  let hasAnyChange = false;

  for (const line of lines) {
    const upperLine = line.toUpperCase();

    if (upperLine === 'NO_CHANGE') {
      if (!hasAnyChange) {
        continue;
      }
    }

    const actionMatch = line.match(/^(PUT_ON|TAKE_OFF|CHANGE)\s*\(\s*"([^"]*?)"\s*\)\s*SLOT\s*\(\s*(\w+)\s*\)$/i);
    if (!actionMatch) {
      console.debug('[OutfitAnalyzer] Skipping unparseable line:', line.slice(0, 100));
      continue;
    }

    const actionRaw = actionMatch[1]?.toUpperCase();
    const description = actionMatch[2] ?? '';
    const slot = actionMatch[3]?.toLowerCase();

    if (!actionRaw || !slot || !OUTFIT_SLOTS.includes(slot)) {
      console.debug('[OutfitAnalyzer] Invalid action/slot:', { actionRaw, slot });
      continue;
    }

    hasAnyChange = true;
    const action = actionRaw === 'PUT_ON' ? 'add' : actionRaw === 'TAKE_OFF' ? 'remove' : 'change';

    if (action === 'add' || action === 'change') {
      updatedOutfit[slot] = description;
      changes.push({ slot, action, description });
    } else if (action === 'remove') {
      updatedOutfit[slot] = '';
      changes.push({ slot, action, description: '' });
    }
  }

  return { changes, updatedOutfit };
}

function formatCurrentOutfit(outfit: Record<string, string>): string {
  const lines: string[] = [];
  for (const slot of OUTFIT_SLOTS) {
    const desc = outfit[slot];
    if (desc && desc.trim()) {
      lines.push(`- ${slot.replace(/_/g, ' ')}: ${desc}`);
    }
  }
  return lines.length > 0 ? lines.join('\n') : '(empty)';
}

export async function analyzeOutfitChanges(params: OutfitAnalyzerParams): Promise<OutfitAnalyzerResult> {
  const { message, charName, currentOutfit, connectionSettings } = params;

  const prompt = ANALYSIS_PROMPT.replace('{currentOutfit}', formatCurrentOutfit(currentOutfit));

  const analysisMessages: ChatCompletionMessage[] = [
    { role: 'system', content: prompt },
    { role: 'user', content: `${charName}'s message: "${message}"` },
  ];

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (connectionSettings.apiKey) {
      headers['Authorization'] = `Bearer ${connectionSettings.apiKey}`;
    }

    const response = await fetch(connectionSettings.apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: connectionSettings.model,
        messages: analysisMessages,
        max_tokens: 256,
        temperature: 0.1,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => 'unable to read body');
      console.error('[OutfitAnalyzer] LLM request failed:', {
        status: response.status,
        statusText: response.statusText,
        body: errorBody.slice(0, 500),
        apiUrl: connectionSettings.apiUrl,
        model: connectionSettings.model,
      });
      return { changes: [], updatedOutfit: currentOutfit };
    }

    const data = await response.json();

    if (!data || typeof data !== 'object') {
      console.error('[OutfitAnalyzer] Invalid response structure: expected object', {
        type: typeof data,
        apiUrl: connectionSettings.apiUrl,
      });
      return { changes: [], updatedOutfit: currentOutfit };
    }

    const content = data.choices?.[0]?.message?.content;

    if (typeof content !== 'string' || content.length === 0) {
      console.warn('[OutfitAnalyzer] No content in LLM response:', {
        hasChoices: Array.isArray(data.choices),
        choicesLength: data.choices?.length,
        apiUrl: connectionSettings.apiUrl,
      });
      return { changes: [], updatedOutfit: currentOutfit };
    }

    return parseOutfitChanges(content, currentOutfit);
  } catch (err) {
    console.error('[OutfitAnalyzer] Error:', {
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
      apiUrl: connectionSettings.apiUrl,
      model: connectionSettings.model,
    });
    return { changes: [], updatedOutfit: currentOutfit };
  }
}
