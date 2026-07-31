import type { ReasoningSettings } from '@/shared/types/reasoning';

export interface ParsedThinking {
  thinking: string | undefined;
  body: string;
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

  let tail = accumulated.slice(lastEnd);

  if (body && suffix) {
    body = body.replace(new RegExp(escapeRegex(suffix), 'g'), '');
  }

  const openIdx = tail.indexOf(prefix);

  if (openIdx !== -1) {
    body += tail.slice(0, openIdx);
    const openContent = tail.slice(openIdx + prefix.length);
    const joined = captures.join(separator);
    const thinking =
      joined.length === 0 && openContent.length === 0 ? undefined : joined + openContent;
    return { thinking, body, inThinking: true };
  }

  // Check if tail ends with a partial prefix start (any length)
  // Buffer the partial so it doesn't leak into body during streaming.
  // Only buffer if we're already inside a thinking block (captures > 0)
  // or the partial is more than 1 char — single-char false positives
  // (like a lone "<") would hide real body content permanently if the
  // stream ended right there.
  let partialLen = 0;
  for (let len = Math.min(prefix.length - 1, tail.length); len >= (captures.length > 0 ? 1 : 2); len--) {
    if (tail.endsWith(prefix.slice(0, len))) {
      partialLen = len;
      break;
    }
  }

  if (partialLen > 0) {
    body += tail.slice(0, tail.length - partialLen);
    const joined = captures.join(separator);
    const thinking = joined.length === 0 ? undefined : joined;
    return { thinking, body, inThinking: true };
  }

  // Check if tail contains a partial suffix while we have captures (mid-stream suffix)
  if (captures.length > 0) {
    let partialSuffixLen = 0;
    for (let len = Math.min(suffix.length - 1, tail.length); len >= 1; len--) {
      if (tail.endsWith(suffix.slice(0, len))) {
        partialSuffixLen = len;
        break;
      }
    }
    if (partialSuffixLen > 0) {
      const openContent = tail.slice(0, tail.length - partialSuffixLen);
      const joined = captures.join(separator);
      const thinking = joined + openContent;
      return { thinking, body, inThinking: true };
    }
  }

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
