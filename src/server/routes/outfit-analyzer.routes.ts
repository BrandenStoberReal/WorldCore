import { z } from 'zod';
import { errorGuard } from '@/server/middleware/errorGuard';
import { withUserId } from '@/server/middleware/withUserId';
import { analyzeOutfitChanges } from '@/server/services/outfit-analyzer';
import { settingsService } from '@/server/services/settings.service';

const DEFAULT_OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

const OutfitAnalysisRequestSchema = z.object({
  message: z.string(),
  charName: z.string(),
  currentOutfit: z.record(z.string()),
  apiKey: z.string().optional(),
});

export const outfitAnalyzerRoutes = {
  analyze: errorGuard(
    withUserId(async (req: Request): Promise<Response> => {
      const body = await req.json();
      const parsed = OutfitAnalysisRequestSchema.parse(body);

      const settings = settingsService.get();
      const resolved = await settings;
      const settingsRecord = resolved as Record<string, unknown>;
      const model = (settingsRecord.chat_completion_model as string) || 'gpt-3.5-turbo';
      const reverseProxy = (settingsRecord.reverse_proxy as string) || undefined;

      const apiUrl = reverseProxy || DEFAULT_OPENAI_URL;
      const apiKey = parsed.apiKey || '';

      const result = await analyzeOutfitChanges({
        message: parsed.message,
        charName: parsed.charName,
        currentOutfit: parsed.currentOutfit,
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
