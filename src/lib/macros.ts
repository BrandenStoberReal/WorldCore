export interface MacroContext {
  userName: string;
  characterName: string;
}

/**
 * Substitute SillyTavern-style {{user}} / {{char}} macros in a chat message string.
 * Macros are matched case-insensitively, tolerate internal whitespace
 * (e.g. `{{ user }}`, `{{  char  }}`), and are substituted everywhere in the input — including
 * inside fenced code blocks (matches ST's behavior of substituting BEFORE parsing).
 * Substitution runs in a single pass per macro family; nested or chained tokens
 * in the same string are all replaced.
 *
 * Supported tokens (case-insensitive, multi-space tolerant):
 *   {{user}}            → ctx.userName
 *   {{personaName}}     → ctx.userName
 *   {{char}}            → ctx.characterName
 *   {{characterName}}   → ctx.characterName
 *
 * Unknown tokens (anything else wrapped in {{...}}) are left as-is.
 * Replacement strings containing {{...}}-looking content are NOT re-resolved (pure single pass).
 */
export function substituteMacros(text: string, ctx: MacroContext): string {
  // Single pass: replacement strings are emitted as-is and never re-scanned, avoiding infinite loops.
  return text.replace(
    /\{\{\s*(user|personaName|char|characterName)\s*\}\}/gi,
    (match, token: string) => {
      const key = token.toLowerCase();
      if (key === 'user' || key === 'personaname') {
        return ctx.userName;
      }
      return ctx.characterName;
    },
  );
}
