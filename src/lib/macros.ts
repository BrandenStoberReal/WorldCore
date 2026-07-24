export interface MacroContext {
  userName: string;
  characterName: string;
  /** Character description field */
  description?: string;
  /** Character personality field */
  personality?: string;
  /** Character scenario field */
  scenario?: string;
  /** Character first_mes field */
  first_mes?: string;
  /** Character mes_example field */
  mes_example?: string;
  /** Character creator_notes field */
  creator_notes?: string;
  /** Character system_prompt field */
  system_prompt?: string;
  /** Character post_history_instructions field */
  post_history_instructions?: string;
  /** Active user persona description (from the personas system) */
  persona?: string;
}

/** Maps macro token names to MacroContext field names (lowercase keys). */
const MACRO_MAP: Record<string, keyof MacroContext> = {
  user: 'userName',
  personaname: 'userName',
  persona: 'persona',
  char: 'characterName',
  charactername: 'characterName',
  description: 'description',
  personality: 'personality',
  scenario: 'scenario',
  first_mes: 'first_mes',
  firstmes: 'first_mes',
  mes_example: 'mes_example',
  mesexample: 'mes_example',
  creator_notes: 'creator_notes',
  creatornotes: 'creator_notes',
  system_prompt: 'system_prompt',
  systemprompt: 'system_prompt',
  post_history_instructions: 'post_history_instructions',
  posthistoryinstructions: 'post_history_instructions',
};

/**
 * Substitute SillyTavern-style {{user}} / {{char}} / {{description}} etc. macros in a string.
 * Macros are matched case-insensitively, tolerate internal whitespace
 * (e.g. `{{ user }}`, `{{  char  }}`), and are substituted everywhere in the input — including
 * inside fenced code blocks (matches ST's behavior of substituting BEFORE parsing).
 * Substitution runs in a single pass; nested or chained tokens
 * in the same string are all replaced.
 *
 * Supported tokens (case-insensitive, multi-space tolerant):
 *   {{user}}            → ctx.userName
 *   {{personaName}}     → ctx.userName
 *   {{persona}}         → ctx.persona
 *   {{char}}            → ctx.characterName
 *   {{characterName}}   → ctx.characterName
 *   {{description}}     → ctx.description
 *   {{personality}}     → ctx.personality
 *   {{scenario}}        → ctx.scenario
 *   {{first_mes}}       → ctx.first_mes
 *   {{mes_example}}     → ctx.mes_example
 *   {{creator_notes}}   → ctx.creator_notes
 *   {{system_prompt}}   → ctx.system_prompt
 *   {{post_history_instructions}} → ctx.post_history_instructions
 *
 * Unknown tokens (anything else wrapped in {{...}}) are left as-is.
 * Replacement strings containing {{...}}-looking content are NOT re-resolved (pure single pass).
 */
export function substituteMacros(text: string, ctx: MacroContext): string {
  // Single pass: replacement strings are emitted as-is and never re-scanned, avoiding infinite loops.
  return text.replace(
    /\{\{\s*(user|personaName|persona|char|characterName|description|personality|scenario|first_mes|firstMes|mes_example|mesExample|creator_notes|creatorNotes|system_prompt|systemPrompt|post_history_instructions|postHistoryInstructions)\s*\}\}/gi,
    (match, token: string) => {
      const key = token.toLowerCase();
      const field = MACRO_MAP[key];
      if (!field) return match;
      const value = ctx[field];
      return typeof value === 'string' ? value : '';
    },
  );
}
