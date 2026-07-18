import { Fragment, type ReactNode } from 'react';
import { CodeBlock } from '@/components/CodeBlock';

/**
 * Render a SillyTavern-accurate core subset of markdown to a React node tree.
 *
 * Supported:
 *   **bold**            → <strong>
 *   *italic*            → <em>     (only with non-adjacent inner whitespace; `* text *` does NOT italicize)
 *   _italic_            → <em>     (only at word boundaries; `foo_bar_baz` NOT italicized — literalMidWordUnderscores)
 *   __bold__            → <strong> (only at word boundaries)
 *   `inline code`      → <code>  (content not formatted further)
 *   ```lang\n...\n```  → <CodeBlock code language>  (fenced; content preserved verbatim)
 *   > quote            → <blockquote> (lines starting with `> `, collected into one blockquote per run)
 *   single \n          → <br>     (simpleLineBreaks)
 *   double \n\n        → <p>...</p>
 *
 * NOT supported (emit raw and ignore): tables, images, footnotes, strikethrough, emoji shortcodes, autolinks, headings
 *
 * HTML is escaped — there is NO raw HTML passthrough. `<script>alert(1)</script>` in the
 * input is rendered as escaped text, NOT a script element.
 *
 * Streaming-safe: an unclosed fenced code block or unclosed inline backtick is rendered with the
 * content received so far (NOT swallowed). An unclosed `**bold` or `*italic` delimiter is rendered
 * as literal asterisks (no half-applied emphasis).
 *
 * Pure function: deterministic, no I/O, no globals, no internal memoization (caller memoizes).
 */
export function renderMarkdown(input: string): ReactNode {
  if (input.length === 0) return null;

  // 1. Split into blocks on blank lines (\n\n+) — on RAW input so > is visible.
  const blocks = input.split(/\n{2,}/);
  const out: ReactNode[] = [];
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    if (block === undefined || block.length === 0) continue;
    out.push(renderBlock(block, 0, i));
  }

  if (out.length === 0) return null;
  if (out.length === 1) {
    const only = out[0];
    return only;
  }
  return <>{out}</>;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FENCE_PLACEHOLDER = '\x00FENCE';
const CODE_PLACEHOLDER = '\x00CODE';
const PLACEHOLDER_END = '\x00';

const MAX_INLINE_DEPTH = 6;
const MAX_BLOCKQUOTE_DEPTH = 3;

const HTML_ESCAPES: Readonly<Record<string, string>> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

function escapeHtml(s: string): string {
  return s.replace(/[&<>]/g, (ch) => HTML_ESCAPES[ch] ?? ch);
}

const HTML_ENTITY_RE = /&(amp|lt|gt|quot|apos|#39|#x27|#\d+);/g;
const HTML_ENTITY_DECODE: Readonly<Record<string, string>> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&apos;': "'",
  '&#39;': "'",
  '&#x27;': "'",
};

function decodeHtmlEntities(s: string): string {
  return s.replace(HTML_ENTITY_RE, (entity) => {
    if (entity in HTML_ENTITY_DECODE) return HTML_ENTITY_DECODE[entity]!;
    const num = entity.startsWith('&#x')
      ? parseInt(entity.slice(3, -1), 16)
      : parseInt(entity.slice(2, -1), 10);
    return Number.isNaN(num) ? entity : String.fromCodePoint(num);
  });
}

// ---------------------------------------------------------------------------
// Fenced code extraction
// ---------------------------------------------------------------------------

interface FencedCode {
  language: string;
  code: string;
}

const FENCE_RE = /```([^\n]*)\n([\s\S]*?)(?:\n```|$)/g;

function extractFencedCode(text: string): {
  text: string;
  fences: FencedCode[];
} {
  const fences: FencedCode[] = [];
  const replaced = text.replace(FENCE_RE, (_match, lang: string, code: string) => {
    const idx = fences.length;
    fences.push({ language: lang, code });
    return `${FENCE_PLACEHOLDER}${idx}${PLACEHOLDER_END}`;
  });
  return { text: replaced, fences };
}

// ---------------------------------------------------------------------------
// Inline code extraction
// ---------------------------------------------------------------------------

const INLINE_CODE_RE = /`([^`\n]+)`/g;

function extractInlineCode(text: string): {
  text: string;
  codes: string[];
} {
  const codes: string[] = [];
  const replaced = text.replace(INLINE_CODE_RE, (_match, code: string) => {
    const idx = codes.length;
    codes.push(code);
    return `${CODE_PLACEHOLDER}${idx}${PLACEHOLDER_END}`;
  });
  return { text: replaced, codes };
}

// ---------------------------------------------------------------------------
// Prepare a text block: escape HTML → extract fenced code → extract inline code
// ---------------------------------------------------------------------------

function prepareBlock(text: string): {
  text: string;
  fences: FencedCode[];
  codes: string[];
} {
  const decoded = decodeHtmlEntities(text);
  const escaped = escapeHtml(decoded);
  const { text: t1, fences } = extractFencedCode(escaped);
  const { text: t2, codes } = extractInlineCode(t1);
  return { text: t2, fences, codes };
}

// ---------------------------------------------------------------------------
// Block-level rendering  (works on RAW input for > detection)
// ---------------------------------------------------------------------------

function renderBlock(
  block: string,
  depth: number,
  key: number,
): ReactNode {
  // Blockquote run: first line starts with `> ` (or is just `>`).
  if (block.startsWith('> ') || block === '>' || block.startsWith('>\n')) {
    return renderBlockquote(block, depth, key);
  }
  return renderParagraphBlock(block, key);
}

function renderBlockquote(
  block: string,
  depth: number,
  key: number,
): ReactNode {
  if (depth >= MAX_BLOCKQUOTE_DEPTH) {
    // Depth exceeded — escape and render as paragraph to avoid infinite recursion.
    const prepared = prepareBlock(block);
    return (
      <p key={key}>
        {renderInlineTokens(prepared.text, prepared.fences, prepared.codes, 0)}
      </p>
    );
  }

  const lines = block.split('\n');
  const bodyLines: string[] = [];
  for (const line of lines) {
    if (line.startsWith('> ')) {
      bodyLines.push(line.slice(2));
    } else if (line === '>') {
      bodyLines.push('');
    } else {
      bodyLines.push(line);
    }
  }

  const body = bodyLines.join('\n');
  // Recursively render the body — may contain nested blockquotes.
  const inner = renderBlock(body, depth + 1, 0);
  return <blockquote key={key}>{inner}</blockquote>;
}

function renderParagraphBlock(block: string, key: number): ReactNode {
  const prepared = prepareBlock(block);
  return renderParagraph(
    prepared.text,
    prepared.fences,
    prepared.codes,
    0,
    key,
  );
}

function renderParagraph(
  text: string,
  fences: FencedCode[],
  codes: string[],
  depth: number,
  key: number,
): ReactNode {
  const segments = text.split('\n');
  const children: ReactNode[] = [];
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    if (seg === undefined) continue;
    if (i > 0) children.push(<br key={`br-${i}`} />);
    children.push(renderInlineTokens(seg, fences, codes, depth));
  }
  return <p key={key}>{children}</p>;
}

// ---------------------------------------------------------------------------
// Inline emphasis  (single-pass left-to-right tokenizer)
// ---------------------------------------------------------------------------

function renderInlineTokens(
  text: string,
  fences: FencedCode[],
  codes: string[],
  depth: number,
): ReactNode {
  if (depth >= MAX_INLINE_DEPTH) return text;
  if (text.length === 0) return '';

  const tokens: ReactNode[] = [];
  let pos = 0;

  while (pos < text.length) {
    // Try placeholders first (opaque — emit as elements, do not recurse).
    const ph = tryMatchPlaceholder(text, pos, fences, codes);
    if (ph !== null) {
      pushToken(tokens, ph.node);
      pos = ph.end;
      continue;
    }

    // Try emphasis in priority: ** > __ > * > _
    const emph = tryMatchEmphasis(text, pos, fences, codes, depth);
    if (emph !== null) {
      pushToken(tokens, emph.node);
      pos = emph.end;
      continue;
    }

    // Try dialogue quotes: "..."
    if (text.charCodeAt(pos) === 0x22) {
      const closeQuote = text.indexOf('"', pos + 1);
      if (closeQuote !== -1) {
        pushToken(tokens, <span key={`q${pos}`} style={{ color: 'var(--dialogue)' }}>{'"'}{text.slice(pos + 1, closeQuote)}{'"'}</span>);
        pos = closeQuote + 1;
        continue;
      }
    }

    // Literal text run up to the next special char.
    const nextSpecial = findNextSpecial(text, pos + 1);
    pushToken(tokens, text.slice(pos, nextSpecial));
    pos = nextSpecial;
  }

  if (tokens.length === 0) return '';
  if (tokens.length === 1) return tokens[0];
  // Return array directly — React supports array returns from components.
  return tokens;
}

/** Merge adjacent string tokens to avoid React <!-- --> separators. */
function pushToken(tokens: ReactNode[], node: ReactNode): void {
  if (
    typeof node === 'string' &&
    tokens.length > 0 &&
    typeof tokens[tokens.length - 1] === 'string'
  ) {
    tokens[tokens.length - 1] = (tokens[tokens.length - 1] as string) + node;
  } else {
    tokens.push(node);
  }
}

// ---------------------------------------------------------------------------
// Placeholder matching
// ---------------------------------------------------------------------------

function tryMatchPlaceholder(
  text: string,
  pos: number,
  fences: FencedCode[],
  codes: string[],
): { node: ReactNode; end: number } | null {
  if (text.charCodeAt(pos) !== 0) return null;
  const re = /\x00(FENCE|CODE)(\d+)\x00/g;
  re.lastIndex = pos;
  const m = re.exec(text);
  if (m === null || m.index !== pos) return null;
  const kind = m[1];
  const idxStr = m[2];
  if (kind === undefined || idxStr === undefined) return null;
  const idx = parseInt(idxStr, 10);
  const end = pos + m[0].length;
  if (kind === 'FENCE') {
    const fence = fences[idx];
    if (fence === undefined) return { node: m[0], end };
    return { node: <CodeBlock key={`f${idx}`} code={fence.code} language={fence.language} />, end };
  }
  const code = codes[idx];
  if (code === undefined) return { node: m[0], end };
  return { node: <code key={`c${idx}`}>{code}</code>, end };
}

// ---------------------------------------------------------------------------
// Emphasis matching
// ---------------------------------------------------------------------------

interface EmphMatch {
  node: ReactNode;
  end: number;
}

function tryMatchEmphasis(
  text: string,
  pos: number,
  fences: FencedCode[],
  codes: string[],
  depth: number,
): EmphMatch | null {
  // Priority 1: **bold**
  const boldStar = matchDelim(text, pos, '**');
  if (boldStar !== null) {
    const inner = text.slice(boldStar.contentStart, boldStar.contentEnd);
    if (isValidEmphContent(inner)) {
      return {
        node: <strong key={`b${pos}`}>{renderInlineTokens(inner, fences, codes, depth + 1)}</strong>,
        end: boldStar.contentEnd + 2,
      };
    }
  }
  // Priority 2: __bold__ at word boundary
  const boldUnder = matchDelim(text, pos, '__');
  if (boldUnder !== null && isWordBoundaryBefore(text, pos)) {
    const inner = text.slice(boldUnder.contentStart, boldUnder.contentEnd);
    if (isValidEmphContent(inner)) {
      return {
        node: <strong key={`B${pos}`}>{renderInlineTokens(inner, fences, codes, depth + 1)}</strong>,
        end: boldUnder.contentEnd + 2,
      };
    }
  }
  // Priority 3: *italic*
  const italStar = matchDelim(text, pos, '*');
  if (italStar !== null) {
    const inner = text.slice(italStar.contentStart, italStar.contentEnd);
    if (isValidEmphContent(inner)) {
      return {
        node: <em key={`i${pos}`}>{renderInlineTokens(inner, fences, codes, depth + 1)}</em>,
        end: italStar.contentEnd + 1,
      };
    }
  }
  // Priority 4: _italic_ at word boundary
  const italUnder = matchDelim(text, pos, '_');
  if (italUnder !== null && isWordBoundaryBefore(text, pos)) {
    const inner = text.slice(italUnder.contentStart, italUnder.contentEnd);
    if (isValidEmphContent(inner)) {
      return {
        node: <em key={`I${pos}`}>{renderInlineTokens(inner, fences, codes, depth + 1)}</em>,
        end: italUnder.contentEnd + 1,
      };
    }
  }
  return null;
}

interface DelimMatch {
  contentStart: number;
  contentEnd: number;
}

function matchDelim(text: string, pos: number, marker: string): DelimMatch | null {
  if (text.slice(pos, pos + marker.length) !== marker) return null;
  const contentStart = pos + marker.length;
  let searchFrom = contentStart;
  while (searchFrom < text.length) {
    const closeIdx = text.indexOf(marker, searchFrom);
    if (closeIdx === -1) return null;
    // For single-char markers, skip if part of a double.
    if (marker.length === 1) {
      const prev = closeIdx > 0 ? text[closeIdx - 1] : '';
      const next = closeIdx + 1 < text.length ? text[closeIdx + 1] : '';
      if (prev === marker || next === marker) {
        searchFrom = closeIdx + 1;
        continue;
      }
    }
    return { contentStart, contentEnd: closeIdx };
  }
  return null;
}

function isWordBoundaryBefore(text: string, pos: number): boolean {
  if (pos === 0) return true;
  const prev = text[pos - 1];
  if (prev === undefined) return true;
  return /\s/.test(prev);
}

function isValidEmphContent(s: string): boolean {
  return s.length > 0 && !/^\s/.test(s) && !/\s$/.test(s);
}

// Find next position >= from where a special char (\x00, *, _, `) appears.
function findNextSpecial(text: string, from: number): number {
  for (let i = from; i < text.length; i++) {
    const ch = text.charCodeAt(i);
    if (ch === 0 || ch === 0x22 || ch === 0x2a || ch === 0x5f || ch === 0x60) {
      return i;
    }
  }
  return text.length;
}
