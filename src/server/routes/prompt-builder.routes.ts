import { errorGuard } from '@/server/middleware/errorGuard';
import { withUserId } from '@/server/middleware/withUserId';
import { promptBuilder } from '@/server/services/prompt-builder';
import { characterService } from '@/server/services/character.service';
import type { ChatMessage } from '@/shared/types/chat';
import { z } from 'zod';

const PromptBuildRequestSchema = z.object({
  characterId: z.number(),
  messages: z.array(
    z.object({
      name: z.string(),
      is_user: z.boolean(),
      mes: z.string(),
      send_date: z.string().optional(),
      extra: z.record(z.unknown()).optional(),
    }),
  ),
  userName: z.string().default('User'),
  systemPromptOverride: z.string().optional(),
  jailbreakPromptOverride: z.string().optional(),
  includeExamples: z.boolean().default(true),
  maxTokens: z.number().optional(),
});

export const promptBuilderRoutes = {
  build: errorGuard(
    withUserId(async (req: Request, userId: string): Promise<Response> => {
      const body = await req.json();
      const parsed = PromptBuildRequestSchema.parse(body);

      const character = await characterService.get(parsed.characterId, userId);
      if (!character) {
        return new Response(JSON.stringify({ error: 'Character not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const worldInfoEntries = character.character_book?.entries
        ? Object.values(character.character_book.entries)
        : [];

      const result = await promptBuilder.buildPrompt({
        character,
        messages: parsed.messages as ChatMessage[],
        worldInfoEntries,
        userName: parsed.userName,
        systemPromptOverride: parsed.systemPromptOverride,
        jailbreakPromptOverride: parsed.jailbreakPromptOverride,
        includeExamples: parsed.includeExamples,
        maxTokens: parsed.maxTokens,
      });

      return new Response(JSON.stringify(result), {
        headers: { 'Content-Type': 'application/json' },
      });
    }),
  ),
};
