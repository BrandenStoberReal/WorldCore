import { errorGuard } from '@/server/middleware/errorGuard';
import { withUserId } from '@/server/middleware/withUserId';
import { promptBuilder, dbToCharacterBookEntry, type CharacterBookEntry, type WiEntryState } from '@/server/services/prompt-builder';
import { characterService } from '@/server/services/character.service';
import { worldInfoService } from '@/server/services/worldinfo.service';
import { personaService } from '@/server/services/persona.service';
import { db } from '@/server/db/client';
import { worldinfoEntryStates } from '@/server/db/schema';
import { eq, and } from 'drizzle-orm';
import type { ChatMessage } from '@/shared/types/chat';
import {
  ContextSettingsSchema,
  InstructSettingsSchema,
  TextOptionsDefaults,
} from '@/shared/schemas/text-options';
import { ReasoningSettingsSchema } from '@/shared/schemas/reasoning';
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
      thinking: z.string().optional(),
      summary: z.string().optional(),
      summaryMessageCount: z.number().optional(),
    }),
  ),
  userName: z.string().default('User'),
  systemPromptOverride: z.string().optional(),
  jailbreakPromptOverride: z.string().optional(),
  includeExamples: z.boolean().default(true),
  maxTokens: z.number().optional(),
  maxContext: z.number().optional(),
  tokenPadding: z.number().optional(),
  summary: z.string().optional(),
  personaId: z.number().nullable().optional(),
  reasoning: ReasoningSettingsSchema.partial().optional(),
  instruct: InstructSettingsSchema.partial().optional(),
  context: ContextSettingsSchema.partial().optional(),
  worldInfoFileIds: z.array(z.number()).optional(),
  chatId: z.string().optional(),
});

async function loadEntryStates(chatId: string, userId: string): Promise<Map<string, WiEntryState>> {
  const rows = await db
    .select()
    .from(worldinfoEntryStates)
    .where(and(eq(worldinfoEntryStates.chatId, chatId), eq(worldinfoEntryStates.userId, userId)));

  const states = new Map<string, WiEntryState>();
  for (const row of rows) {
    states.set(row.entryUid, {
      entryUid: row.entryUid,
      chatId: row.chatId,
      activatedAtMessageIndex: row.activatedAtMessageIndex,
      activationCount: row.activationCount,
      consecutiveMatches: row.consecutiveMatches,
      lastDeactivatedAt: row.lastDeactivatedAt,
      isActive: row.isActive,
    });
  }
  return states;
}

async function saveEntryStates(
  chatId: string,
  states: Map<string, WiEntryState>,
  userId: string,
): Promise<void> {
  for (const [entryUid, state] of states) {
    const existing = await db
      .select()
      .from(worldinfoEntryStates)
      .where(and(eq(worldinfoEntryStates.chatId, chatId), eq(worldinfoEntryStates.entryUid, entryUid)))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(worldinfoEntryStates)
        .set({
          activatedAtMessageIndex: state.activatedAtMessageIndex,
          activationCount: state.activationCount,
          consecutiveMatches: state.consecutiveMatches,
          lastDeactivatedAt: state.lastDeactivatedAt,
          isActive: state.isActive,
        })
        .where(and(eq(worldinfoEntryStates.chatId, chatId), eq(worldinfoEntryStates.entryUid, entryUid)));
    } else {
      await db.insert(worldinfoEntryStates).values({
        chatId,
        entryUid,
        activatedAtMessageIndex: state.activatedAtMessageIndex,
        activationCount: state.activationCount,
        consecutiveMatches: state.consecutiveMatches,
        lastDeactivatedAt: state.lastDeactivatedAt,
        isActive: state.isActive,
        userId,
      });
    }
  }
}

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

      const inlineEntries = character.character_book?.entries
        ? Object.values(character.character_book.entries)
        : [];

      const standaloneEntries: CharacterBookEntry[] = [];
      if (parsed.worldInfoFileIds && parsed.worldInfoFileIds.length > 0) {
        for (const fileId of parsed.worldInfoFileIds) {
          const wiData = await worldInfoService.get(fileId, userId);
          if (wiData?.entries) {
            const entries = Object.values(wiData.entries);
            for (const entry of entries) {
              standaloneEntries.push(dbToCharacterBookEntry(entry));
            }
          }
        }
      }

      const worldInfoEntries = [...inlineEntries, ...standaloneEntries];

      const scanDepth = character.character_book?.scan_depth ?? undefined;
      const tokenBudget = character.character_book?.token_budget ?? undefined;

      let entryStates: Map<string, WiEntryState> | undefined;
      if (parsed.chatId) {
        entryStates = await loadEntryStates(parsed.chatId, userId);
      }

      let persona: {
        name: string;
        description?: string;
        personality?: string;
        scenario?: string;
        systemPrompt?: string;
      } | null = null;
      if (parsed.personaId) {
        persona = await personaService.get(parsed.personaId, userId);
      }
      if (!persona) {
        persona = await personaService.getDefault(userId);
      }

      const result = await promptBuilder.buildPrompt({
        character,
        messages: parsed.messages as ChatMessage[],
        worldInfoEntries,
        userName: parsed.userName,
        systemPromptOverride: parsed.systemPromptOverride,
        jailbreakPromptOverride: parsed.jailbreakPromptOverride,
        includeExamples: parsed.includeExamples,
        maxTokens: parsed.maxTokens,
        maxContext: parsed.maxContext,
        tokenPadding: parsed.tokenPadding,
        scanDepth,
        tokenBudget,
        chatId: parsed.chatId,
        chatMessageCount: parsed.messages.length,
        entryStates,
        summary: parsed.summary,
        persona,
        reasoning: parsed.reasoning
          ? { ...TextOptionsDefaults.reasoning, ...parsed.reasoning }
          : undefined,
        instruct: parsed.instruct
          ? { ...TextOptionsDefaults.instruct, ...parsed.instruct }
          : undefined,
        context: parsed.context ? { ...TextOptionsDefaults.context, ...parsed.context } : undefined,
      });

      if (parsed.chatId && result.updatedEntryStates) {
        await saveEntryStates(parsed.chatId, result.updatedEntryStates, userId);
      }

      console.log('=== PROMPT BUILDER RESULT ===');
      console.log(
        'INSTRUCT (merged):',
        JSON.stringify(
          parsed.instruct ? { ...TextOptionsDefaults.instruct, ...parsed.instruct } : undefined,
          null,
          2,
        ),
      );
      console.log(
        'CONTEXT (merged):',
        JSON.stringify(
          parsed.context ? { ...TextOptionsDefaults.context, ...parsed.context } : undefined,
          null,
          2,
        ),
      );
      console.log('MESSAGES COUNT:', result.messages.length);
      console.log('MESSAGES:', JSON.stringify(result.messages, null, 2));
      console.log('STOP STRINGS:', result.stopStrings);
      console.log('=== END PROMPT BUILDER ===');

      return new Response(JSON.stringify(result), {
        headers: { 'Content-Type': 'application/json' },
      });
    }),
  ),
};
