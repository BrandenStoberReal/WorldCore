import type { ChatCompletionMessage } from '@/shared/types/backends/chatcompletions';

export interface SummaryMessageInput {
  name: string;
  is_user: boolean;
  mes: string;
}

export interface SummarizeParams {
  messages: SummaryMessageInput[];
  charName: string;
  userName: string;
  keepRecentCount?: number;
  connectionSettings: {
    apiUrl: string;
    apiKey?: string;
    model: string;
  };
}

export interface SummarizeResult {
  summary: string;
  summarizedCount: number;
  keptCount: number;
}

const DEFAULT_KEEP_RECENT = 10;

export async function summarizeMessages(params: SummarizeParams): Promise<SummarizeResult | null> {
  const {
    messages,
    charName,
    userName,
    keepRecentCount = DEFAULT_KEEP_RECENT,
    connectionSettings,
  } = params;

  if (messages.length <= keepRecentCount) {
    return null;
  }

  const messagesToSummarize = messages.slice(0, messages.length - keepRecentCount);
  const keptMessages = messages.slice(messages.length - keepRecentCount);

  const conversationText = messagesToSummarize
    .map((m) => `${m.is_user ? userName : charName}: ${m.mes}`)
    .join('\n\n');

  // Guard against exceeding model context window
  // Conservative limit: 80% of typical 128k context, minus room for system prompt and output
  const MAX_INPUT_TOKENS = 100000;
  const estimatedTokens = Math.ceil(conversationText.length / 4);
  let truncatedText = conversationText;
  let truncatedCount = 0;

  if (estimatedTokens > MAX_INPUT_TOKENS) {
    // Truncate from the beginning (oldest messages first)
    const charsPerToken = 4;
    const maxChars = MAX_INPUT_TOKENS * charsPerToken;
    truncatedText = conversationText.slice(-maxChars);
    // Find the first complete message after truncation
    const firstNewline = truncatedText.indexOf('\n\n');
    if (firstNewline > 0) {
      truncatedText = truncatedText.slice(firstNewline + 2);
    }
    truncatedCount = messagesToSummarize.length - Math.ceil(truncatedText.length / (charsPerToken * 100));
  }

  const summaryPrompt: ChatCompletionMessage[] = [
    {
      role: 'system',
      content: `You are a conversation summarizer. Summarize the following conversation between ${userName} and ${charName}. Focus on key plot points, character decisions, emotional states, and important details. Be concise but preserve critical context that would be needed to continue the conversation naturally. Output only the summary, no preamble.`,
    },
    {
      role: 'user',
      content: truncatedText,
    },
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
        messages: summaryPrompt,
        max_tokens: 1024,
        temperature: 0.3,
        stream: false,
      }),
    });

    if (!response.ok) {
      console.error('[summarizer] LLM request failed:', response.status, await response.text());
      return null;
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const summary = data.choices?.[0]?.message?.content?.trim();
    if (!summary) {
      console.error('[summarizer] No summary content in response');
      return null;
    }

    return {
      summary,
      summarizedCount: messagesToSummarize.length - truncatedCount,
      keptCount: keptMessages.length,
    };
  } catch (err) {
    console.error('[summarizer] Error calling LLM:', err);
    return null;
  }
}
