import type { ChatMessage } from '@/shared/types/chat';

// ST native JSONL: line 0 = metadata, lines 1..N = messages
export function importSTJsonl(lines: string[]): ChatMessage[] {
  return lines
    .slice(1)
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line)) as ChatMessage[];
}

// oobabooga format: { data_visible: [[user_msg, char_msg], ...] }
export function importOobaChat(
  userName: string,
  characterName: string,
  jsonData: Record<string, unknown>,
): ChatMessage[] {
  const dataVisible = jsonData.data_visible as unknown[][] | undefined;
  if (!dataVisible || !Array.isArray(dataVisible)) {
    return [];
  }

  const messages: ChatMessage[] = [];
  const now = new Date().toISOString();

  for (const pair of dataVisible) {
    if (!Array.isArray(pair) || pair.length < 2) continue;
    const [userMsg, charMsg] = pair as [string, string];

    messages.push({
      name: userName,
      is_user: true,
      send_date: now,
      mes: userMsg,
      extra: {},
    });

    messages.push({
      name: characterName,
      is_user: false,
      send_date: now,
      mes: charMsg,
      extra: {},
    });
  }

  return messages;
}

// Agnai format: { messages: [{ userId: bool, msg: string }, ...] }
export function importAgnaiChat(
  userName: string,
  characterName: string,
  jsonData: Record<string, unknown>,
): ChatMessage[] {
  const rawMessages = jsonData.messages as Array<Record<string, unknown>> | undefined;
  if (!rawMessages || !Array.isArray(rawMessages)) {
    return [];
  }

  const now = new Date().toISOString();

  return rawMessages.map((m) => ({
    name: m.userId ? userName : characterName,
    is_user: !!m.userId,
    send_date: now,
    mes: (m.msg as string) || '',
    extra: {},
  }));
}

// CAI Tools format: { histories: [{ msgs: [{ src: { is_human: bool }, text: string }] }] }
// Returns multiple chats — we import the first one
export function importCAIChat(
  userName: string,
  characterName: string,
  jsonData: Record<string, unknown>,
): ChatMessage[] {
  const histories = jsonData.histories as Array<Record<string, unknown>> | undefined;
  if (!histories || !Array.isArray(histories) || histories.length === 0) {
    return [];
  }

  const firstHistory = histories[0] as Record<string, unknown>;
  const msgs = firstHistory.msgs as Array<Record<string, unknown>> | undefined;
  if (!msgs || !Array.isArray(msgs)) {
    return [];
  }

  const now = new Date().toISOString();

  return msgs.map((m) => {
    const src = m.src as Record<string, unknown> | undefined;
    const isHuman = src?.is_human as boolean | undefined;

    return {
      name: isHuman ? userName : characterName,
      is_user: !!isHuman,
      send_date: now,
      mes: (m.text as string) || '',
      extra: {},
    };
  });
}

// Kobold Lite format: { savedsettings: { chatname: string }, actions: [{ type: "INPUT"|"OUTPUT", token: "..." }] }
export function importKoboldLiteChat(
  userName: string,
  characterName: string,
  jsonData: Record<string, unknown>,
): ChatMessage[] {
  const actions = jsonData.actions as Array<Record<string, unknown>> | undefined;
  if (!actions || !Array.isArray(actions)) {
    return [];
  }

  const messages: ChatMessage[] = [];
  const now = new Date().toISOString();

  for (const action of actions) {
    const type = action.type as string | undefined;
    if (!type) continue;

    const token = action.token as string | undefined;
    if (!token) continue;

    if (type === 'INPUT') {
      messages.push({
        name: userName,
        is_user: true,
        send_date: now,
        mes: token,
        extra: {},
      });
    } else if (type === 'OUTPUT') {
      messages.push({
        name: characterName,
        is_user: false,
        send_date: now,
        mes: token,
        extra: {},
      });
    }
  }

  return messages;
}

// RisuAI format: { type: "risuChat", data: { message: [{ role: string, name: string, data: string, time: string }] } }
export function importRisuChat(
  userName: string,
  characterName: string,
  jsonData: Record<string, unknown>,
): ChatMessage[] {
  const data = jsonData.data as Record<string, unknown> | undefined;
  if (!data) return [];

  const rawMessages = data.message as Array<Record<string, unknown>> | undefined;
  if (!rawMessages || !Array.isArray(rawMessages)) {
    return [];
  }

  return rawMessages.map((m) => {
    const role = m.role as string | undefined;
    const isUser = role === 'user' || role === 'self';

    return {
      name: isUser ? (m.name as string) || userName : (m.name as string) || characterName,
      is_user: isUser,
      send_date: (m.time as string) || new Date().toISOString(),
      mes: (m.data as string) || '',
      extra: {},
    };
  });
}

// Chub Chat format — flattens nested mes.message and swipes.message
export function flattenChubChat(
  userName: string,
  characterName: string,
  lines: string[],
): ChatMessage[] {
  return lines
    .filter((line) => line.trim())
    .map((line) => {
      const parsed = JSON.parse(line) as Record<string, unknown>;

      // Handle nested message format
      let mes = (parsed.mes as string) || '';
      if (parsed.message && typeof parsed.message === 'object') {
        const msgObj = parsed.message as Record<string, unknown>;
        mes = (msgObj.message as string) || mes;
      }

      // Handle nested swipes
      let swipes: string[] | undefined;
      if (parsed.swipes && Array.isArray(parsed.swipes)) {
        const swipeArr = parsed.swipes as Array<Record<string, unknown>>;
        swipes = swipeArr.map((s) => (s.message as string) || '').filter(Boolean);
      }

      const isUser = !!parsed.is_user;

      return {
        name: (parsed.name as string) || (isUser ? userName : characterName),
        is_user: isUser,
        send_date: (parsed.send_date as string) || new Date().toISOString(),
        mes,
        extra: (parsed.extra as Record<string, unknown>) || {},
        swipes: swipes?.length ? swipes : undefined,
      } as ChatMessage;
    });
}

// Detect format from file content
export function detectChatFormat(content: string): string {
  const trimmed = content.trim();

  // Try JSON first
  try {
    const parsed = JSON.parse(trimmed) as Record<string, unknown>;

    if (Array.isArray(parsed.data_visible)) return 'json-ooba';
    if (
      Array.isArray(parsed.messages) &&
      parsed.messages.some((m: Record<string, unknown>) => m.userId !== undefined)
    )
      return 'json-agnai';
    if (Array.isArray(parsed.histories)) return 'json-cai';
    if (parsed.actions && Array.isArray(parsed.actions)) return 'json-kobold';
    if (parsed.type === 'risuChat') return 'json-risu';
  } catch {
    // Not JSON — could be JSONL
  }

  // Check for JSONL (multiple JSON lines)
  const lines = trimmed.split('\n').filter((l) => l.trim());
  if (lines.length > 1) {
    try {
      const first = JSON.parse(lines[0]!) as Record<string, unknown>;
      if (first.chat_metadata || first.user_name || (first.name && first.is_user !== undefined)) {
        return 'jsonl';
      }
    } catch {
      // Not valid JSONL
    }
  }

  // Default: treat as Chub format
  return 'json-chub';
}

// Main import dispatcher
export function importChat(
  content: string,
  userName: string,
  characterName: string,
): ChatMessage[] {
  const format = detectChatFormat(content);

  switch (format) {
    case 'jsonl':
      return importSTJsonl(content.split('\n'));
    case 'json-ooba':
      return importOobaChat(
        userName,
        characterName,
        JSON.parse(content) as Record<string, unknown>,
      );
    case 'json-agnai':
      return importAgnaiChat(
        userName,
        characterName,
        JSON.parse(content) as Record<string, unknown>,
      );
    case 'json-cai':
      return importCAIChat(userName, characterName, JSON.parse(content) as Record<string, unknown>);
    case 'json-kobold':
      return importKoboldLiteChat(
        userName,
        characterName,
        JSON.parse(content) as Record<string, unknown>,
      );
    case 'json-risu':
      return importRisuChat(
        userName,
        characterName,
        JSON.parse(content) as Record<string, unknown>,
      );
    case 'json-chub':
      return flattenChubChat(
        userName,
        characterName,
        content.split('\n').filter((l) => l.trim()),
      );
    default:
      throw new Error(`Unsupported chat format: ${format}`);
  }
}
