import type { CharacterData } from '@/shared/types/character';
import type { ChatMessage } from '@/shared/types/chat';
import type { ChatCompletionMessage } from '@/shared/types/backends/chatcompletions';
import type { ContextSettings, InstructSettings } from '@/shared/types/text-options';
import type { WorldInfoEntry } from '@/shared/types/worldinfo';
import { TiktokenTokenizer } from '@/server/tokenizers/tiktoken';
import { substituteMacros, type MacroContext } from '@/lib/macros';

export interface CharacterBookEntry {
  id?: string | number;
  name: string;
  keys: string[];
  secondary_keys: string[];
  comment: string;
  content: string;
  constant: boolean;
  selective: boolean;
  insertion_order: number;
  priority: number;
  enabled: boolean;
  case_sensitive: boolean;
  matchWholeWords: boolean;
  position: string | number;
  depth?: number;
  use_regex: boolean;
  probability: number;
  useProbability: boolean;
  selectiveLogic: number;
  sticky: boolean;
  stickyCount: number;
  cooldown: number;
  delay: number;
  excludeRecursion: boolean;
  preventRecursion: boolean;
  extensions?: Record<string, unknown>;
}

export function dbToCharacterBookEntry(entry: WorldInfoEntry): CharacterBookEntry {
  const positionMap: Record<number, string | number> = {
    0: 'before_char',
    1: 'after_char',
    2: "at_end as an author's note",
    3: 'in-chat',
    4: 'in-chat',
  };
  return {
    id: entry.uid,
    name: entry.comment || '',
    keys: entry.key ? [entry.key] : [],
    secondary_keys: entry.keysecondary ?? [],
    comment: entry.comment ?? '',
    content: entry.content ?? '',
    constant: entry.constant ?? false,
    selective: entry.selective ?? false,
    insertion_order: entry.order ?? 0,
    priority: 10,
    enabled: !(entry.disable ?? false),
    case_sensitive: entry.caseSensitive ?? false,
    matchWholeWords: entry.matchWholeWords ?? false,
    position: positionMap[entry.position as number] ?? 'before_char',
    depth: entry.depth ?? 0,
    use_regex: false,
    probability: entry.probability ?? 1,
    useProbability: entry.useProbability ?? false,
    selectiveLogic: entry.selectiveLogic ?? 0,
    sticky: entry.sticky ?? false,
    stickyCount: 0,
    cooldown: entry.cooldown ?? 0,
    delay: entry.delay ?? 0,
    excludeRecursion: entry.excludeRecursion ?? false,
    preventRecursion: entry.preventRecursion ?? false,
  };
}

export interface PromptBuilderParams {
  character: CharacterData;
  messages: ChatMessage[];
  worldInfoEntries: CharacterBookEntry[];
  userName: string;
  systemPromptOverride?: string;
  jailbreakPromptOverride?: string;
  includeExamples?: boolean;
  maxTokens?: number;
  maxContext?: number;
  tokenPadding?: number;
  scanDepth?: number;
  tokenBudget?: number;
  chatId?: string;
  chatMessageCount?: number;
  entryStates?: Map<string, WiEntryState>;
  persona?: {
    name: string;
    description?: string;
    personality?: string;
    scenario?: string;
    systemPrompt?: string;
  } | null;
  reasoning?: {
    addToPrompts: boolean;
    maxAdditions: number;
    prefix: string;
    suffix: string;
    separator: string;
  };
  instruct?: InstructSettings;
  context?: ContextSettings;
  summary?: string;
  outfit?: {
    disabled?: boolean;
    items?: Record<string, string>;
  };
}

export interface WiEntryState {
  entryUid: string;
  chatId: string;
  activatedAtMessageIndex: number;
  activationCount: number;
  consecutiveMatches: number;
  lastDeactivatedAt: number;
  isActive: boolean;
}

export interface PromptBuilderResult {
  messages: ChatCompletionMessage[];
  tokenCount: number;
  stopStrings?: string[];
  needsSummarization?: boolean;
  messagesToSummarize?: ChatMessage[];
  updatedEntryStates?: Map<string, WiEntryState>;
}

/**
 * Server-side prompt builder that mirrors SillyTavern's prompt assembly logic.
 * Handles character data injection, World Info, example messages, and post-history instructions.
 */
export class PromptBuilder {
  private tokenizer: TiktokenTokenizer;

  constructor() {
    this.tokenizer = new TiktokenTokenizer('gpt-4'); // Default to cl100k_base encoding
  }

  /**
   * Build the complete prompt array for LLM consumption.
   * Follows SillyTavern's prompt ordering and injection patterns.
   */
  async buildPrompt(params: PromptBuilderParams): Promise<PromptBuilderResult> {
    const {
      character,
      messages,
      worldInfoEntries,
      userName,
      systemPromptOverride,
      jailbreakPromptOverride,
      includeExamples = true,
      maxTokens = 4096,
      maxContext,
      tokenPadding = 1024,
      scanDepth = 10,
      tokenBudget,
      chatId,
      chatMessageCount,
      entryStates,
      summary,
    } = params;

    const charName = character.name;
    const macroCtx: MacroContext = {
      userName,
      characterName: charName,
      description: character.description,
      personality: character.personality,
      scenario: character.scenario,
      first_mes: character.first_mes,
      mes_example: character.mes_example,
      creator_notes: character.creator_notes,
      system_prompt: character.system_prompt,
      post_history_instructions: character.post_history_instructions,
    };
    const context = params.context;
    const persona = params.persona;
    if (persona) {
      const personaName = persona.name?.trim() ?? '';
      if (personaName) {
        macroCtx.userName = personaName;
      }
      if (persona.description?.trim()) {
        macroCtx.persona = persona.description.trim();
      }
    }
    const messagesArray: ChatCompletionMessage[] = [];

    // Pre-compute activated world info entries once
    const { activated: activatedWiEntries, updatedStates } = this.getActivatedEntries(
      worldInfoEntries,
      messages,
      scanDepth,
      entryStates,
      chatId,
      chatMessageCount ?? messages.length,
    );

    // 1. Add World Info before character definitions
    const worldInfoBefore = this.filterAndJoinWiEntries(activatedWiEntries, 'before_char', 0, tokenBudget);
    if (worldInfoBefore) {
      messagesArray.push({
        role: 'system',
        content: substituteMacros(worldInfoBefore, macroCtx),
      });
    }

    const storyStringContent = context?.storyString
      ? this.renderStoryString(context.storyString, character, macroCtx, systemPromptOverride)
      : '';

    const useStoryString =
      context != null &&
      storyStringContent.trim().length > 0 &&
      (!params.instruct?.enabled || !params.instruct.systemPrompt);

    let storyContent = storyStringContent;
    if (useStoryString && params.instruct?.enabled) {
      const seq = params.instruct.systemSequence || '';
      const suf = params.instruct.systemSuffix || '';
      if (seq && storyContent.startsWith(seq)) {
        storyContent = storyContent.slice(seq.length);
      }
      if (suf && storyContent.endsWith(suf)) {
        storyContent = storyContent.slice(0, -suf.length);
      } else if (suf && storyContent.endsWith(suf.trimEnd())) {
        storyContent = storyContent.slice(0, -suf.trimEnd().length);
      }
    }

    if (useStoryString && context!.storyStringPosition === 'inchat') {
      // Story string placed inchat — skip here
    } else if (useStoryString) {
      messagesArray.push({
        role: context!.storyStringRole,
        content: storyContent,
      });
    } else if (params.instruct?.enabled && params.instruct.systemPrompt) {
      messagesArray.push({
        role: 'system',
        content: substituteMacros(params.instruct.systemPrompt, macroCtx),
      });
    } else if (systemPromptOverride) {
      messagesArray.push({
        role: 'system',
        content: substituteMacros(systemPromptOverride, macroCtx),
      });
    } else {
      const mainPrompt = this.getMainPrompt(character, charName, userName);
      if (mainPrompt) {
        messagesArray.push({
          role: 'system',
          content: substituteMacros(mainPrompt, macroCtx),
        });
      }
    }

    // 3. Add World Info after character definitions
    const worldInfoAfter = this.filterAndJoinWiEntries(activatedWiEntries, 'after_char', 1, tokenBudget);
    if (worldInfoAfter) {
      messagesArray.push({
        role: 'system',
        content: substituteMacros(worldInfoAfter, macroCtx),
      });
    }

    if (useStoryString) {
    } else {
      // 4. Add character description
      if (character.description) {
        messagesArray.push({
          role: 'system',
          content: substituteMacros(`Description: ${character.description}`, macroCtx),
        });
      }

      // 5. Add character personality
      if (character.personality) {
        messagesArray.push({
          role: 'system',
          content: substituteMacros(
            `${charName}'s personality: ${character.personality}`,
            macroCtx,
          ),
        });
      }

      // 6. Add scenario
      if (character.scenario) {
        messagesArray.push({
          role: 'system',
          content: substituteMacros(`Scenario: ${character.scenario}`, macroCtx),
        });
      }

      // 6.1 Add current outfit (if provided and not disabled)
      if (params.outfit && !params.outfit.disabled && params.outfit.items) {
        const outfitLines: string[] = [];
        for (const [slot, desc] of Object.entries(params.outfit.items)) {
          if (desc && desc.trim()) {
            outfitLines.push(`- ${slot.replace(/_/g, ' ')}: ${desc}`);
          }
        }
        if (outfitLines.length > 0) {
          messagesArray.push({
            role: 'system',
            content: `[Current outfit]\n${outfitLines.join('\n')}`,
          });
        }
      }
    }

    // 6.5 Persona description block (between scenario and character system_prompt)
    if (persona && !useStoryString) {
      const personaName = persona.name?.trim() ?? '';
      if (persona.description?.trim()) {
        messagesArray.push({
          role: 'system',
          content: substituteMacros(
            personaName
              ? `[User Persona] ${personaName}: ${persona.description.trim()}`
              : `[User Persona]: ${persona.description.trim()}`,
            macroCtx,
          ),
        });
      }
      if (persona.personality?.trim()) {
        messagesArray.push({
          role: 'system',
          content: substituteMacros(
            personaName
              ? `${personaName}'s personality: ${persona.personality.trim()}`
              : `User persona personality: ${persona.personality.trim()}`,
            macroCtx,
          ),
        });
      }
      if (persona.scenario?.trim()) {
        messagesArray.push({
          role: 'system',
          content: substituteMacros(`Persona scenario: ${persona.scenario.trim()}`, macroCtx),
        });
      }
      if (persona.systemPrompt?.trim()) {
        messagesArray.push({
          role: 'system',
          content: substituteMacros(persona.systemPrompt.trim(), macroCtx),
        });
      }
    }

    // 7. Add system prompt (character's system_prompt field)
    if (!useStoryString && !systemPromptOverride && character.system_prompt) {
      messagesArray.push({
        role: 'system',
        content: substituteMacros(character.system_prompt, macroCtx),
      });
    }

    // 8. Add example messages (if enabled)
    const skipExamples = params.instruct?.enabled && params.instruct.skipExamples;
    if (includeExamples && !skipExamples && character.mes_example) {
      const exampleSeparator = context?.exampleSeparator ?? '';
      const exampleMessages = this.formatExampleMessages(
        character.mes_example,
        charName,
        userName,
        macroCtx,
        exampleSeparator,
      );
      messagesArray.push(...exampleMessages);
    }

    // 9. Add chat history
    const historyStartIdx = messagesArray.length;
    let historyMessages: ChatCompletionMessage[];

    if (summary) {
      historyMessages = [
        {
          role: 'system',
          content: `[Previous conversation summary]\n${summary}`,
        },
        ...messages.slice(-10).map((msg) => ({
          role: (msg.is_user ? 'user' : 'assistant') as 'user' | 'assistant',
          content: substituteMacros(msg.mes, macroCtx),
          name: msg.name,
        })),
      ];
    } else {
      historyMessages = this.formatChatHistory(messages, charName, userName, macroCtx);
    }
    messagesArray.push(...historyMessages);

    // 9.1 inchat story_string placement
    if (useStoryString && context!.storyStringPosition === 'inchat') {
      const depth = Math.max(0, context!.storyStringDepth);
      const insertIdx = Math.max(historyStartIdx, messagesArray.length - depth);
      messagesArray.splice(insertIdx, 0, {
        role: context!.storyStringRole,
        content: storyContent,
      });
    }

    // 9.2 chat_start separator
    if (context?.chatStart && context.chatStart.trim().length > 0 && historyMessages.length > 0) {
      messagesArray.splice(historyStartIdx, 0, {
        role: 'system',
        content: substituteMacros(context.chatStart, macroCtx),
      });
    }

    // 9.5 Inject previous thinking content into prompts (when addToPrompts enabled)
    if (params.reasoning?.addToPrompts && params.reasoning.prefix && params.reasoning.suffix) {
      const thinkingContent = this.extractThinkingFromMessages(
        messages,
        params.reasoning.prefix,
        params.reasoning.suffix,
        params.reasoning.separator,
        params.reasoning.maxAdditions,
      );
      if (thinkingContent) {
        messagesArray.push({
          role: 'system',
          content: `[Previous thinking]\n${thinkingContent}`,
        });
      }
    }

    // 9.5.1 Inject world info at_end as author's note
    const worldInfoAuthorNote = this.filterAndJoinWiEntries(activatedWiEntries, "at_end as an author's note", undefined, tokenBudget);
    if (worldInfoAuthorNote) {
      messagesArray.push({
        role: 'system',
        content: substituteMacros(worldInfoAuthorNote, macroCtx),
      });
    }

    // 9.5.2 Inject world info in-chat at specified depths
    const worldInfoInChat = this.filterWiEntriesInChat(activatedWiEntries, tokenBudget);
    for (const wiEntry of worldInfoInChat) {
      const insertIdx = Math.max(historyStartIdx, messagesArray.length - wiEntry.depth);
      messagesArray.splice(insertIdx, 0, {
        role: 'system',
        content: substituteMacros(wiEntry.content, macroCtx),
      });
    }

    // 9.6 Inject character depth_prompt at specified depth in chat history
    const depthPrompt = (character as Record<string, unknown>).extensions;
    const dp =
      depthPrompt && typeof depthPrompt === 'object' && 'depth_prompt' in depthPrompt
        ? (depthPrompt as Record<string, unknown>).depth_prompt
        : null;
    if (
      dp &&
      typeof dp === 'object' &&
      'prompt' in dp &&
      typeof (dp as Record<string, unknown>).prompt === 'string' &&
      (dp as Record<string, unknown>).prompt
    ) {
      const dpObj = dp as Record<string, unknown>;
      const dpDepth = typeof dpObj.depth === 'number' ? dpObj.depth : 4;
      const dpRole = dpObj.role === 'user' || dpObj.role === 'assistant' ? dpObj.role : 'system';
      const dpContent = substituteMacros(dpObj.prompt as string, macroCtx);
      const insertIdx = Math.max(historyStartIdx, messagesArray.length - dpDepth);
      messagesArray.splice(insertIdx, 0, {
        role: dpRole,
        content: dpContent,
      });
    }

    // 10. Add post-history instructions (jailbreak)
    const jailbreakPrompt = jailbreakPromptOverride || character.post_history_instructions;
    if (jailbreakPrompt) {
      messagesArray.push({
        role: 'system',
        content: substituteMacros(jailbreakPrompt, macroCtx),
      });
    }

    // 11. Apply context formatting (trimSpaces, collapseNewlines, singleLine)
    const formattedMessages = context
      ? this.applyContextFormatting(messagesArray, context)
      : messagesArray;

    // 12. Compute stop strings (namesAsStopStrings, singleLine)
    const stopStrings = this.computeStopStrings(context, charName, userName);

    const tokenCount = this.countTokens(formattedMessages);

    let needsSummarization = false;
    let messagesToSummarize: ChatMessage[] | undefined;

    if (maxContext && tokenCount > maxContext - tokenPadding && !summary && messages.length > 10) {
      needsSummarization = true;
      messagesToSummarize = messages.slice(0, messages.length - 10);
    }

    return {
      messages: formattedMessages,
      tokenCount,
      stopStrings: stopStrings.length > 0 ? stopStrings : undefined,
      needsSummarization,
      messagesToSummarize,
      updatedEntryStates: updatedStates,
    };
  }

  private filterAndJoinWiEntries(
    entries: CharacterBookEntry[],
    position: string | number,
    numericPosition: number | undefined,
    tokenBudget?: number,
  ): string {
    const filtered = entries.filter((entry) => {
      if (typeof position === 'string') {
        return entry.position === position;
      }
      return numericPosition !== undefined && entry.position === numericPosition;
    });

    if (filtered.length === 0) return '';

    const sorted = filtered.sort((a, b) => a.insertion_order - b.insertion_order);
    return this.joinEntriesWithBudget(sorted, tokenBudget);
  }

  private filterWiEntriesInChat(
    entries: CharacterBookEntry[],
    tokenBudget?: number,
  ): Array<{ content: string; depth: number }> {
    const inChatEntries = entries.filter((entry) => entry.position === 'in-chat');

    if (inChatEntries.length === 0) return [];

    const sorted = inChatEntries.sort((a, b) => a.insertion_order - b.insertion_order);
    const result: Array<{ content: string; depth: number }> = [];
    let usedTokens = 0;

    for (const entry of sorted) {
      const entryTokens = this.tokenizer.countTokens(entry.content);
      if (tokenBudget && usedTokens + entryTokens > tokenBudget) break;
      usedTokens += entryTokens;
      result.push({
        content: entry.content,
        depth: typeof entry.depth === 'number' ? entry.depth : 0,
      });
    }

    return result;
  }

  private joinEntriesWithBudget(entries: CharacterBookEntry[], tokenBudget?: number): string {
    if (entries.length === 0) return '';

    if (!tokenBudget) {
      return entries.map((entry) => entry.content).join('\n\n');
    }

    const parts: string[] = [];
    let usedTokens = 0;

    for (const entry of entries) {
      const entryTokens = this.tokenizer.countTokens(entry.content);
      if (usedTokens + entryTokens > tokenBudget) break;
      usedTokens += entryTokens;
      parts.push(entry.content);
    }

    return parts.join('\n\n');
  }

  private getActivatedEntries(
    entries: CharacterBookEntry[],
    messages: ChatMessage[],
    scanDepth: number = 10,
    entryStates?: Map<string, WiEntryState>,
    chatId?: string,
    chatMessageCount?: number,
  ): { activated: CharacterBookEntry[]; updatedStates: Map<string, WiEntryState> } {
    const recentMessages = messages.slice(-scanDepth);
    const chatTextRaw = recentMessages.map((m) => m.mes).join('\n');
    const chatTextLower = chatTextRaw.toLowerCase();

    const activated: CharacterBookEntry[] = [];
    const activatedContents = new Set<string>();
    const updatedStates = new Map<string, WiEntryState>();

    const getEntryState = (entryUid: string): WiEntryState => {
      const existing = entryStates?.get(entryUid);
      if (existing) {
        updatedStates.set(entryUid, { ...existing });
        return updatedStates.get(entryUid)!;
      }
      const newState: WiEntryState = {
        entryUid,
        chatId: chatId ?? '',
        activatedAtMessageIndex: 0,
        activationCount: 0,
        consecutiveMatches: 0,
        lastDeactivatedAt: 0,
        isActive: false,
      };
      updatedStates.set(entryUid, newState);
      return newState;
    };

    const checkEntry = (entry: CharacterBookEntry, textRaw: string, textLower: string): boolean => {
      if (!entry.enabled) return false;
      if (entry.constant) return true;

      const keys = entry.keys;
      if (!keys || keys.length === 0) return false;

      const primaryMatch = this.checkKeyMatch(
        keys,
        textRaw,
        textLower,
        entry.case_sensitive ?? false,
        entry.matchWholeWords ?? false,
        entry.use_regex ?? false,
      );

      if (!primaryMatch) return false;

      if (entry.selective && entry.secondary_keys && entry.secondary_keys.length > 0) {
        const secondaryKeys = entry.secondary_keys;
        const secondaryLogic = entry.selectiveLogic ?? 0;

        if (secondaryLogic === 0) {
          const secondaryMatch = this.checkKeyMatch(
            secondaryKeys,
            textRaw,
            textLower,
            entry.case_sensitive ?? false,
            entry.matchWholeWords ?? false,
            entry.use_regex ?? false,
          );
          if (!secondaryMatch) return false;
        } else {
          const allSecondaryMatch = secondaryKeys.every((key) =>
            this.checkKeyMatch(
              [key],
              textRaw,
              textLower,
              entry.case_sensitive ?? false,
              entry.matchWholeWords ?? false,
              entry.use_regex ?? false,
            ),
          );
          if (!allSecondaryMatch) return false;
        }
      }

      return true;
    };

    const processEntry = (entry: CharacterBookEntry) => {
      if (activatedContents.has(entry.content)) return;

      const entryUid = String(entry.id ?? entry.name ?? entry.content.slice(0, 50));
      const state = getEntryState(entryUid);
      const currentMessageIndex = chatMessageCount ?? messages.length;

      if (state.isActive) {
        if (entry.sticky) {
          activated.push(entry);
          activatedContents.add(entry.content);
          return;
        }
        state.isActive = false;
        state.lastDeactivatedAt = currentMessageIndex;
      }

      if (entry.cooldown > 0 && state.lastDeactivatedAt > 0) {
        const messagesSinceDeactivation = currentMessageIndex - state.lastDeactivatedAt;
        if (messagesSinceDeactivation < entry.cooldown) {
          state.consecutiveMatches = 0;
          return;
        }
      }

      if (entry.useProbability && entry.probability < 1) {
        if (Math.random() >= entry.probability) {
          state.consecutiveMatches = 0;
          return;
        }
      }

      const entryDepth = typeof entry.depth === 'number' && entry.depth > 0 ? entry.depth : scanDepth;
      const entryMessages = messages.slice(-entryDepth);
      const entryTextRaw = entryMessages.map((m) => m.mes).join('\n');
      const entryTextLower = entryTextRaw.toLowerCase();

      if (checkEntry(entry, entryTextRaw, entryTextLower)) {
        state.consecutiveMatches++;

        if (entry.delay > 0 && state.consecutiveMatches < entry.delay) {
          return;
        }

        activated.push(entry);
        activatedContents.add(entry.content);
        state.isActive = true;
        state.activatedAtMessageIndex = currentMessageIndex;
        state.activationCount++;
      } else {
        state.consecutiveMatches = 0;
      }
    };

    for (const entry of entries) {
      if (entry.excludeRecursion) {
        processEntry(entry);
      }
    }

    let previousSize = -1;
    while (activated.length !== previousSize) {
      previousSize = activated.length;

      for (const entry of entries) {
        if (entry.preventRecursion) continue;
        if (activatedContents.has(entry.content)) continue;

        const entryDepth = typeof entry.depth === 'number' && entry.depth > 0 ? entry.depth : scanDepth;
        const entryMessages = messages.slice(-entryDepth);
        const entryTextRaw = entryMessages.map((m) => m.mes).join('\n');
        const entryTextLower = entryTextRaw.toLowerCase();

        const allTextRaw = entryTextRaw + '\n' + [...activatedContents].join('\n');
        const allTextLower = allTextRaw.toLowerCase();

        const entryUid = String(entry.id ?? entry.name ?? entry.content.slice(0, 50));
        const state = getEntryState(entryUid);
        const currentMessageIndex = chatMessageCount ?? messages.length;

        if (state.isActive) {
          if (entry.sticky) {
            activated.push(entry);
            activatedContents.add(entry.content);
            continue;
          }
          state.isActive = false;
          state.lastDeactivatedAt = currentMessageIndex;
        }

        if (entry.cooldown > 0 && state.lastDeactivatedAt > 0) {
          const messagesSinceDeactivation = currentMessageIndex - state.lastDeactivatedAt;
          if (messagesSinceDeactivation < entry.cooldown) {
            state.consecutiveMatches = 0;
            continue;
          }
        }

        if (entry.useProbability && entry.probability < 1) {
          if (Math.random() >= entry.probability) {
            state.consecutiveMatches = 0;
            continue;
          }
        }

        if (checkEntry(entry, allTextRaw, allTextLower)) {
          state.consecutiveMatches++;

          if (entry.delay > 0 && state.consecutiveMatches < entry.delay) {
            continue;
          }

          activated.push(entry);
          activatedContents.add(entry.content);
          state.isActive = true;
          state.activatedAtMessageIndex = currentMessageIndex;
          state.activationCount++;
        } else {
          state.consecutiveMatches = 0;
        }
      }
    }

    return { activated, updatedStates };
  }

  private checkKeyMatch(
    keys: string[],
    chatTextRaw: string,
    chatTextLower: string,
    caseSensitive: boolean,
    matchWholeWords: boolean,
    useRegex: boolean,
  ): boolean {
    return keys.some((key) => {
      if (!key) return false;

      if (useRegex) {
        try {
          const flags = caseSensitive ? '' : 'i';
          const regex = new RegExp(key, flags);
          return regex.test(chatTextRaw);
        } catch {
          return false;
        }
      }

      if (caseSensitive) {
        if (matchWholeWords) {
          const regex = new RegExp(`\\b${this.escapeRegex(key)}\\b`);
          return regex.test(chatTextRaw);
        }
        return chatTextRaw.includes(key);
      }

      const keyLower = key.toLowerCase();
      if (matchWholeWords) {
        const regex = new RegExp(`\\b${this.escapeRegex(keyLower)}\\b`);
        return regex.test(chatTextLower);
      }
      return chatTextLower.includes(keyLower);
    });
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Get the main system prompt (SillyTavern's default main prompt).
   */
  private getMainPrompt(character: CharacterData, charName: string, userName: string): string {
    return `Write ${charName}'s next reply in a fictional chat between ${charName} and ${userName}.`;
  }

  /**
   * Format example messages from character's mes_example field.
   * Converts <START> blocks to few-shot examples.
   */
  private formatExampleMessages(
    mesExample: string,
    charName: string,
    userName: string,
    macroCtx: MacroContext,
    exampleSeparator: string,
  ): ChatCompletionMessage[] {
    if (!mesExample) return [];

    const messages: ChatCompletionMessage[] = [];
    const blocks = mesExample.split(/<START>/gi).filter((block) => block.trim());

    if (blocks.length > 0) {
      messages.push({
        role: 'system',
        content: 'Example dialogue:',
      });
    }

    for (let bi = 0; bi < blocks.length; bi++) {
      const block = blocks[bi];
      if (!block) continue;
      if (bi > 0 && messages.length > 0) {
        messages.push({
          role: 'system',
          content: exampleSeparator ? substituteMacros(exampleSeparator, macroCtx) : '---',
        });
      }
      const lines = block.trim().split('\n');
      let currentRole: 'user' | 'assistant' = 'user';
      let currentContent = '';

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;

        // Check for role indicators
        if (trimmedLine.toLowerCase().startsWith(`${userName}:`)) {
          // Save previous message if exists
          if (currentContent) {
            messages.push({
              role: currentRole,
              content: substituteMacros(currentContent.trim(), macroCtx),
            });
          }
          currentRole = 'user';
          currentContent = trimmedLine.substring(userName.length + 1).trim();
        } else if (trimmedLine.toLowerCase().startsWith(`${charName}:`)) {
          // Save previous message if exists
          if (currentContent) {
            messages.push({
              role: currentRole,
              content: substituteMacros(currentContent.trim(), macroCtx),
            });
          }
          currentRole = 'assistant';
          currentContent = trimmedLine.substring(charName.length + 1).trim();
        } else {
          // Continue current message
          currentContent += '\n' + trimmedLine;
        }
      }

      // Add the last message in the block
      if (currentContent) {
        messages.push({
          role: currentRole,
          content: substituteMacros(currentContent.trim(), macroCtx),
        });
      }
    }

    return messages;
  }

  /**
   * Format chat history messages for LLM consumption.
   */
  private formatChatHistory(
    messages: ChatMessage[],
    charName: string,
    userName: string,
    macroCtx: MacroContext,
  ): ChatCompletionMessage[] {
    return messages.map((msg) => ({
      role: msg.is_user ? 'user' : 'assistant',
      content: substituteMacros(msg.mes, macroCtx),
      name: msg.name,
    }));
  }

  private extractThinkingFromMessages(
    messages: ChatMessage[],
    prefix: string,
    suffix: string,
    separator: string,
    maxAdditions: number,
  ): string | null {
    const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`${escapeRegex(prefix)}(.*?)${escapeRegex(suffix)}`, 'gs');

    const thinkingChunks: string[] = [];
    const assistantMessages = messages.filter((m) => !m.is_user && m.thinking);

    for (const msg of assistantMessages) {
      if (thinkingChunks.length >= maxAdditions) break;
      const thinking = msg.thinking!;
      if (thinking.trim()) {
        thinkingChunks.push(thinking.trim());
      }
    }

    if (thinkingChunks.length === 0) return null;
    return thinkingChunks.join(separator);
  }

  private countTokens(messages: ChatCompletionMessage[]): number {
    let totalTokens = 0;
    for (const msg of messages) {
      totalTokens += this.tokenizer.countTokens(msg.content);
      if (msg.name) {
        totalTokens += this.tokenizer.countTokens(msg.name);
      }
    }
    return totalTokens;
  }

  private renderStoryString(
    template: string,
    character: CharacterData,
    macroCtx: MacroContext,
    systemPromptOverride?: string,
  ): string {
    const systemPrompt = systemPromptOverride || character.system_prompt || '';
    const ctx: Record<string, string> = {
      char: character.name ?? '',
      user: macroCtx.userName ?? '',
      system: systemPrompt,
      system_prompt: systemPrompt,
      description: character.description ?? '',
      personality: character.personality ?? '',
      scenario: character.scenario ?? '',
      persona: macroCtx.persona ?? '',
      mes_example: character.mes_example ?? '',
      first_mes: character.first_mes ?? '',
      creator_notes: character.creator_notes ?? '',
      anchorBefore: '',
      anchorAfter: '',
      wiBefore: '',
      wiAfter: '',
    };
    let rendered = this.evalHandlebars(template, ctx);
    rendered = rendered.replace(/\{\{trim\}\}/gi, '').trimEnd();
    rendered = substituteMacros(rendered, macroCtx);
    return rendered;
  }

  private evalHandlebars(template: string, ctx: Record<string, string>): string {
    let result = template;
    const ifRe = /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g;
    let prev: string;
    do {
      prev = result;
      result = result.replace(ifRe, (_m, key: string, body: string) => {
        const val = ctx[key];
        return val && val.trim().length > 0 ? body : '';
      });
    } while (result !== prev && ifRe.test(result));
    result = result.replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, key: string) => {
      return ctx[key] ?? '';
    });
    return result;
  }

  private applyContextFormatting(
    messages: ChatCompletionMessage[],
    context: ContextSettings,
  ): ChatCompletionMessage[] {
    return messages.map((m) => {
      let content = m.content;
      if (context.trimSpaces) {
        content = content
          .split('\n')
          .map((line) => line.trim())
          .join('\n')
          .trim();
      }
      if (context.collapseNewlines) {
        content = content.replace(/\n{2,}/g, '\n');
      }
      if (context.singleLine) {
        content = content.replace(/\n+/g, ' ').trim();
      }
      return { ...m, content };
    });
  }

  private computeStopStrings(
    context: ContextSettings | undefined,
    charName: string,
    userName: string,
  ): string[] {
    const stops: string[] = [];
    if (context?.singleLine) {
      if (!stops.includes('\n')) stops.push('\n');
    }
    return stops;
  }
}

// Export singleton instance
export const promptBuilder = new PromptBuilder();
