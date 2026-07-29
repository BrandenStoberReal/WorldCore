import type { ReasoningSettings } from '@/shared/types/reasoning';

export interface ParsedThinking {
  /** Extracted thinking content joined via separator. Undefined when no blocks matched or content is empty. */
  thinking: string | undefined;
  /** Body with every thinking block stripped out. */
  body: string;
  /** True when accumulated has an open prefix with no matching suffix yet (mid-stream). */
  inThinking: boolean;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function parseThinkingChunks(
  accumulated: string,
  opts: Pick<ReasoningSettings, 'prefix' | 'suffix' | 'separator'>,
): ParsedThinking {
  const { prefix, suffix, separator } = opts;

  if (!prefix || !suffix) {
    return { thinking: undefined, body: accumulated, inThinking: false };
  }

  const re = new RegExp(`${escapeRegex(prefix)}(.*?)${escapeRegex(suffix)}`, 'gs');

  const captures: string[] = [];
  let body = '';
  let lastEnd = 0;

  let m: RegExpExecArray | null;
  while ((m = re.exec(accumulated)) !== null) {
    body += accumulated.slice(lastEnd, m.index);
    captures.push(m[1]!);
    lastEnd = re.lastIndex;
  }

  const tail = accumulated.slice(lastEnd);
  const openIdx = tail.indexOf(prefix);

  if (openIdx !== -1) {
    // Unclosed prefix — we're in an open block
    body += tail.slice(0, openIdx);
    const openContent = tail.slice(openIdx + prefix.length);
    const joined = captures.join(separator);
    const thinking =
      joined.length === 0 && openContent.length === 0 ? undefined : joined + openContent;
    return { thinking, body, inThinking: true };
  }

  // No open block — the rest is all body
  body += tail;

  if (captures.length === 0) {
    return { thinking: undefined, body: accumulated, inThinking: false };
  }

  const joined = captures.join(separator);
  return {
    thinking: joined.length === 0 ? undefined : joined,
    body,
    inThinking: false,
  };
}
