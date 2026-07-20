import type { CharacterData } from '@/shared/types/character';
import type { ChatMessage } from '@/shared/types/chat';
import type { ChatCompletionMessage } from '@/shared/types/backends/chatcompletions';
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
}

export interface PromptBuilderResult {
  messages: ChatCompletionMessage[];
  tokenCount: number;
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
    const messagesArray: ChatCompletionMessage[] = [];

    // 1. Add World Info before character definitions
    const worldInfoBefore = this.getWorldInfoBefore(worldInfoEntries, messages);
    if (worldInfoBefore) {
      messagesArray.push({
        role: 'system',
        content: substituteMacros(worldInfoBefore, macroCtx),
      });
    }

    // 2. Add main system prompt (creator_notes or default)
    const mainPrompt = this.getMainPrompt(character, charName, userName);
    if (mainPrompt) {
      messagesArray.push({
        role: 'system',
        content: substituteMacros(mainPrompt, macroCtx),
      });
    }

    // 3. Add World Info after character definitions
    const worldInfoAfter = this.getWorldInfoAfter(worldInfoEntries, messages);
    if (worldInfoAfter) {
      messagesArray.push({
        role: 'system',
        content: substituteMacros(worldInfoAfter, macroCtx),
      });
    }

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

    // 7. Add system prompt (character's system_prompt field)
    const systemPrompt = systemPromptOverride || character.system_prompt;
    if (systemPrompt) {
      messagesArray.push({
        role: 'system',
        content: substituteMacros(systemPrompt, macroCtx),
      });
    }

    // 8. Add example messages (if enabled)
    if (includeExamples && character.mes_example) {
      const exampleMessages = this.formatExampleMessages(
        character.mes_example,
        charName,
        userName,
        macroCtx,
      );
      messagesArray.push(...exampleMessages);
    }

    // 9. Add chat history
    const historyMessages = this.formatChatHistory(messages, charName, userName, macroCtx);
    messagesArray.push(...historyMessages);

    // 10. Add post-history instructions (jailbreak)
    const jailbreakPrompt = jailbreakPromptOverride || character.post_history_instructions;
    if (jailbreakPrompt) {
      messagesArray.push({
        role: 'system',
        content: substituteMacros(jailbreakPrompt, macroCtx),
      });
    }

    const tokenCount = this.countTokens(messagesArray);

    return {
      messages: messagesArray,
      tokenCount,
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
    // Use creator_notes if available, otherwise use default
    if (character.creator_notes) {
      return character.creator_notes;
    }

    // SillyTavern's default main prompt
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
  ): ChatCompletionMessage[] {
    if (!mesExample) return [];

    const messages: ChatCompletionMessage[] = [];
    const blocks = mesExample.split(/<START>/gi).filter((block) => block.trim());

    for (const block of blocks) {
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
}

// Export singleton instance
export const promptBuilder = new PromptBuilder();
