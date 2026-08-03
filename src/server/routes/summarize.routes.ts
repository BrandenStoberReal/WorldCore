import { z } from 'zod';
import { errorGuard } from '@/server/middleware/errorGuard';
import { withUserId } from '@/server/middleware/withUserId';
import { summarizeMessages } from '@/server/services/summarizer';
import { settingsService } from '@/server/services/settings.service';

const DEFAULT_OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

const SummarizeRequestSchema = z.object({
  messages: z.array(
    z
      .object({
        name: z.string(),
        is_user: z.boolean(),
        mes: z.string(),
        send_date: z.string().optional(),
        thinking: z.string().optional(),
        extra: z.record(z.unknown()).optional(),
      })
      .passthrough(),
  ),
  charName: z.string(),
  userName: z.string(),
  keepRecentCount: z.number().optional(),
  apiKey: z.string().optional(),
});

export const summarizeRoutes = {
  summarize: errorGuard(
    withUserId(async (req: Request): Promise<Response> => {
      const body = await req.json();
      const parsed = SummarizeRequestSchema.parse(body);

      const settings = settingsService.get();
      const resolved = await settings;
      const settingsRecord = resolved as Record<string, unknown>;
      const model = (settingsRecord.chat_completion_model as string) || 'gpt-3.5-turbo';
      const reverseProxy = (settingsRecord.reverse_proxy as string) || undefined;

      const apiUrl = reverseProxy || DEFAULT_OPENAI_URL;
      const apiKey = parsed.apiKey || '';

      const result = await summarizeMessages({
        messages: parsed.messages,
        charName: parsed.charName,
        userName: parsed.userName,
        keepRecentCount: parsed.keepRecentCount,
        connectionSettings: {
          apiUrl,
          apiKey,
          model,
        },
      });

      return new Response(JSON.stringify(result), {
        headers: { 'Content-Type': 'application/json' },
      });
    }),
  ),
};
