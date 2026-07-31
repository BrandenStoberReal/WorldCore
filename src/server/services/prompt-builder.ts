import type { CharacterData } from '@/shared/types/character';
import type { ChatMessage } from '@/shared/types/chat';
import type { ChatCompletionMessage } from '@/shared/types/backends/chatcompletions';
import type { ContextSettings, InstructSettings } from '@/shared/types/text-options';
import { TiktokenTokenizer } from '@/server/tokenizers/tiktoken';
import { substituteMacros, type MacroContext } from '@/lib/macros';

interface CharacterBookEntry {
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
  position: string | number;
  use_regex: boolean;
  extensions?: Record<string, unknown>;
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
}

export interface PromptBuilderResult {
  messages: ChatCompletionMessage[];
  tokenCount: number;
  stopStrings?: string[];
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

    // 1. Add World Info before character definitions
    const worldInfoBefore = this.getWorldInfoBefore(worldInfoEntries, messages);
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
    const worldInfoAfter = this.getWorldInfoAfter(worldInfoEntries, messages);
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
          content: substituteMacros(`${charName}'s personality: ${character.personality}`, macroCtx),
        });
      }

      // 6. Add scenario
      if (character.scenario) {
        messagesArray.push({
          role: 'system',
          content: substituteMacros(`Scenario: ${character.scenario}`, macroCtx),
        });
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
    const historyMessages = this.formatChatHistory(messages, charName, userName, macroCtx);
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

    return {
      messages: formattedMessages,
      tokenCount,
      stopStrings: stopStrings.length > 0 ? stopStrings : undefined,
    };
  }

  /**
   * Get World Info entries that should appear before character definitions.
   * Matches SillyTavern's worldInfoBefore placement.
   */
  private getWorldInfoBefore(entries: CharacterBookEntry[], messages: ChatMessage[]): string {
    const activatedEntries = this.getActivatedEntries(entries, messages);
    const beforeEntries = activatedEntries.filter(
      (entry) => entry.position === 'before_char' || entry.position === 0,
    );

    if (beforeEntries.length === 0) return '';

    return beforeEntries
      .sort((a, b) => a.insertion_order - b.insertion_order)
      .map((entry) => entry.content)
      .join('\n\n');
  }

  /**
   * Get World Info entries that should appear after character definitions.
   * Matches SillyTavern's worldInfoAfter placement.
   */
  private getWorldInfoAfter(entries: CharacterBookEntry[], messages: ChatMessage[]): string {
    const activatedEntries = this.getActivatedEntries(entries, messages);
    const afterEntries = activatedEntries.filter(
      (entry) => entry.position === 'after_char' || entry.position === 1,
    );

    if (afterEntries.length === 0) return '';

    return afterEntries
      .sort((a, b) => a.insertion_order - b.insertion_order)
      .map((entry) => entry.content)
      .join('\n\n');
  }

  /**
   * Get World Info entries that are activated by the current chat context.
   * Scans messages for matching keys.
   */
  private getActivatedEntries(
    entries: CharacterBookEntry[],
    messages: ChatMessage[],
  ): CharacterBookEntry[] {
    const scanDepth = 10;
    const recentMessages = messages.slice(-scanDepth);
    const chatText = recentMessages
      .map((m) => m.mes)
      .join('\n')
      .toLowerCase();

    return entries.filter((entry) => {
      if (!entry.enabled) return false;
      if (entry.constant) return true;

      const keys = entry.keys;
      if (!keys || keys.length === 0) return false;

      const keyMatch = keys.some((key) => {
        if (!key) return false;
        const keyLower = key.toLowerCase();
        return entry.case_sensitive ? chatText.includes(keyLower) : chatText.includes(keyLower);
      });

      if (!keyMatch) return false;

      return true;
    });
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

    for (let bi = 0; bi < blocks.length; bi++) {
      const block = blocks[bi];
      if (!block) continue;
      if (bi > 0 && exampleSeparator && messages.length > 0) {
        messages.push({
          role: 'system',
          content: substituteMacros(exampleSeparator, macroCtx),
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
    if (context?.namesAsStopStrings) {
      if (charName && !stops.includes(charName)) stops.push(`${charName}:`);
      if (userName && !stops.includes(userName)) stops.push(`${userName}:`);
    }
    if (context?.singleLine) {
      if (!stops.includes('\n')) stops.push('\n');
    }
    return stops;
  }
}

// Export singleton instance
export const promptBuilder = new PromptBuilder();
