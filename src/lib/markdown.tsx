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
 * NOT supported (emit raw and ignore): tables, footnotes, strikethrough, emoji shortcodes, autolinks, headings
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
export interface RenderMarkdownOptions {
  /**
   * When true, an unclosed emphasis/code delimiter (no matching closer found) is rendered
   * as a visible `<span class="md-opening-tag">` marker followed by the remaining text wrapped
   * in the corresponding formatting element (`<strong>`, `<em>`, or `<code>`). This is intended
   * for LLM token-streaming UX: a partial `**bold tex` shows the `**` marker plus bold "bold tex",
   * and once the closing `**` arrives the same input renders as plain `**bold text**` → `<strong>`.
   *
   * When false/undefined, unclosed delimiters render as literal text (backward compatible).
   */
  highlightOpeningTags?: boolean;
  /**
   * When true, markdown images ![alt](url) are rendered as <img> elements.
   * When false/undefined, image syntax is rendered as plain text.
   * Default: false
   */
  allowExternalMedia?: boolean;
}

export function renderMarkdown(input: string, options?: RenderMarkdownOptions): ReactNode {
  if (input.length === 0) return null;
  const highlight = options?.highlightOpeningTags === true;
  const allowExternalMedia = options?.allowExternalMedia === true;

  // 1. Split into blocks on blank lines (\n\n+) — on RAW input so > is visible.
  const blocks = input.split(/\n{2,}/);
  const out: ReactNode[] = [];
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    if (block === undefined || block.length === 0) continue;
    out.push(renderBlock(block, 0, i, highlight, allowExternalMedia));
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
const IMG_PLACEHOLDER = '\x00IMG';
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
// Image extraction  (only when allowExternalMedia is true)
// ---------------------------------------------------------------------------

interface ImageRef {
  alt: string;
  url: string;
}

const IMG_RE = /!\[([^\]]*)\]\(([^)]+)\)/g;

function extractImages(text: string): {
  text: string;
  images: ImageRef[];
} {
  const images: ImageRef[] = [];
  const replaced = text.replace(IMG_RE, (_match, alt: string, url: string) => {
    const idx = images.length;
    images.push({ alt, url });
    return `${IMG_PLACEHOLDER}${idx}${PLACEHOLDER_END}`;
  });
  return { text: replaced, images };
}

// ---------------------------------------------------------------------------
// Prepare a text block: escape HTML → extract fenced code → extract inline code
// ---------------------------------------------------------------------------

function prepareBlock(text: string, allowExternalMedia: boolean): {
  text: string;
  fences: FencedCode[];
  codes: string[];
  images: ImageRef[];
} {
  const decoded = decodeHtmlEntities(text);
  const escaped = escapeHtml(decoded);
  const { text: t1, fences } = extractFencedCode(escaped);
  const { text: t2, codes } = extractInlineCode(t1);
  let t3: string;
  let images: ImageRef[] = [];
  if (allowExternalMedia) {
    const img = extractImages(t2);
    t3 = img.text;
    images = img.images;
  } else {
    t3 = t2;
  }
  return { text: t3, fences, codes, images };
}

// ---------------------------------------------------------------------------
// Block-level rendering  (works on RAW input for > detection)
// ---------------------------------------------------------------------------

function renderBlock(
  block: string,
  depth: number,
  key: number,
  highlight: boolean,
  allowExternalMedia: boolean,
): ReactNode {
  if (block.startsWith('> ') || block === '>' || block.startsWith('>\n')) {
    return renderBlockquote(block, depth, key, highlight, allowExternalMedia);
  }
  const listMatch = detectList(block);
  if (listMatch) {
    return renderList(block, listMatch.ordered, key, highlight, allowExternalMedia);
  }
  return renderParagraphBlock(block, key, highlight, allowExternalMedia);
}

const UL_RE = /^[-*]\s+/;
const OL_RE = /^\d+\.\s+/;

function detectList(block: string): { ordered: boolean } | null {
  const lines = block.split('\n');
  let ulCount = 0;
  let olCount = 0;
  for (const line of lines) {
    if (UL_RE.test(line)) ulCount++;
    else if (OL_RE.test(line)) olCount++;
  }
  if (ulCount + olCount < 2) return null;
  if (olCount > ulCount) return { ordered: true };
  return { ordered: false };
}

function renderList(
  block: string,
  ordered: boolean,
  key: number,
  highlight: boolean,
  allowExternalMedia: boolean,
): ReactNode {
  const lines = block.split('\n');
  const items: ReactNode[] = [];
  let currentText: string[] = [];

  const flushItem = (itemKey: number) => {
    if (currentText.length === 0) return;
    const text = currentText.join('\n');
    const prepared = prepareBlock(text, allowExternalMedia);
    items.push(
      <li key={`li-${itemKey}`}>
        {renderInlineTokens(prepared.text, prepared.fences, prepared.codes, prepared.images, 0, highlight)}
      </li>,
    );
    currentText = [];
  };

  let itemIdx = 0;
  for (const line of lines) {
    if (UL_RE.test(line)) {
      flushItem(itemIdx);
      itemIdx++;
      currentText.push(line.replace(UL_RE, ''));
    } else if (OL_RE.test(line)) {
      flushItem(itemIdx);
      itemIdx++;
      currentText.push(line.replace(OL_RE, ''));
    } else {
      currentText.push(line);
    }
  }
  flushItem(itemIdx);

  return ordered ? <ol key={key}>{items}</ol> : <ul key={key}>{items}</ul>;
}

function renderBlockquote(
  block: string,
  depth: number,
  key: number,
  highlight: boolean,
  allowExternalMedia: boolean,
): ReactNode {
  if (depth >= MAX_BLOCKQUOTE_DEPTH) {
    // Depth exceeded — escape and render as paragraph to avoid infinite recursion.
    const prepared = prepareBlock(block, allowExternalMedia);
    return (
      <p key={key}>
        {renderInlineTokens(prepared.text, prepared.fences, prepared.codes, prepared.images, 0, highlight)}
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
  const inner = renderBlock(body, depth + 1, 0, highlight, allowExternalMedia);
  return <blockquote key={key}>{inner}</blockquote>;
}

function renderParagraphBlock(block: string, key: number, highlight: boolean, allowExternalMedia: boolean): ReactNode {
  const prepared = prepareBlock(block, allowExternalMedia);
  return renderParagraph(prepared.text, prepared.fences, prepared.codes, prepared.images, 0, key, highlight);
}

function renderParagraph(
  text: string,
  fences: FencedCode[],
  codes: string[],
  images: ImageRef[],
  depth: number,
  key: number,
  highlight: boolean,
): ReactNode {
  const segments = text.split('\n');
  const children: ReactNode[] = [];
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    if (seg === undefined) continue;
    if (i > 0) children.push(<br key={`br-${i}`} />);
    children.push(renderInlineTokens(seg, fences, codes, images, depth, highlight));
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
  images: ImageRef[],
  depth: number,
  highlight: boolean = false,
): ReactNode {
  if (depth >= MAX_INLINE_DEPTH) return text;
  if (text.length === 0) return '';

  const tokens: ReactNode[] = [];
  let pos = 0;

  while (pos < text.length) {
    // Try placeholders first (opaque — emit as elements, do not recurse).
    const ph = tryMatchPlaceholder(text, pos, fences, codes, images);
    if (ph !== null) {
      pushToken(tokens, ph.node);
      pos = ph.end;
      continue;
    }

    // Try inline code (must come before emphasis to avoid ` being consumed as italic)
    const codeResult = tryMatchInlineCode(text, pos, highlight);
    if (codeResult !== null) {
      pushToken(tokens, codeResult.node);
      pos = codeResult.end;
      continue;
    }

    // Try emphasis in priority: ** > __ > * > _
    const emph = tryMatchEmphasis(text, pos, fences, codes, images, depth, highlight);
    if (emph !== null) {
      pushToken(tokens, emph.node);
      pos = emph.end;
      continue;
    }

    // Try dialogue quotes: "..." or \u201c...\u201d
    const qCode = text.charCodeAt(pos);
    if (qCode === 0x22 || qCode === 0x201c) {
      const closeQ = qCode === 0x22 ? text.indexOf('"', pos + 1) : text.indexOf('\u201d', pos + 1);
      const qChar = qCode === 0x22 ? '"' : '\u201c';
      if (closeQ !== -1) {
        const inner = text.slice(pos + 1, closeQ);
        const qClose = qCode === 0x22 ? '"' : '\u201d';
        pushToken(
          tokens,
          <span key={`q${pos}`} style={{ color: 'var(--dialogue)' }}>
            {qChar}
            {renderInlineTokens(inner, fences, codes, images, depth, false)}
            {qClose}
          </span>,
        );
        pos = closeQ + 1;
        continue;
      }
      if (highlight) {
        const rest = text.slice(pos + 1);
        pushToken(
          tokens,
          <span key={`q${pos}`} style={{ color: 'var(--dialogue)' }}>
            {qChar}
            {renderInlineTokens(rest, fences, codes, images, depth, false)}
          </span>,
        );
        pos = text.length;
        continue;
      }
    }

    // Literal text run up to the next special char.
    const nextSpecial = findNextSpecial(text, pos + 1);
    pushToken(tokens, text.slice(pos, nextSpecial));
    pos = nextSpecial;
  }

  if (tokens.length === 0) return null;
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
  images: ImageRef[],
): { node: ReactNode; end: number } | null {
  if (text.charCodeAt(pos) !== 0) return null;
  const re = /\x00(FENCE|CODE|IMG)(\d+)\x00/g;
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
  if (kind === 'IMG') {
    const img = images[idx];
    if (img === undefined) return { node: m[0], end };
    return {
      node: (
        <img
          key={`img${idx}`}
          src={img.url}
          alt={img.alt}
          loading="lazy"
          className="max-h-[20em] max-w-full rounded"
        />
      ),
      end,
    };
  }
  const code = codes[idx];
  if (code === undefined) return { node: m[0], end };
  return { node: <code key={`c${idx}`}>{code}</code>, end };
}

// ---------------------------------------------------------------------------
// Inline code matching (highlight-aware)
// ---------------------------------------------------------------------------

interface InlineCodeMatch {
  node: ReactNode;
  end: number;
}

function tryMatchInlineCode(text: string, pos: number, highlight: boolean): InlineCodeMatch | null {
  if (text.charCodeAt(pos) !== 0x60) return null;

  const closeIdx = text.indexOf('`', pos + 1);
  if (closeIdx !== -1 && closeIdx > pos + 1) return null;

  const nlIdx = text.indexOf('\n', pos + 1);
  const end = nlIdx !== -1 ? nlIdx : text.length;
  const rest = text.slice(pos + 1, end);
  if (rest.length === 0) return null;

  if (highlight) {
    return {
      node: (
        <span key={`uch${pos}`}>
          <span className="md-opening-tag">{'`'}</span>
          <code>{rest}</code>
        </span>
      ),
      end,
    };
  }

  return null;
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
  images: ImageRef[],
  depth: number,
  highlight: boolean = false,
): EmphMatch | null {
  // Priority 1: **bold**
  const boldStar = matchDelim(text, pos, '**');
  if (boldStar !== null) {
    const inner = text.slice(boldStar.contentStart, boldStar.contentEnd);
    if (isValidEmphContent(inner)) {
      return {
        node: (
          <strong key={`b${pos}`} data-depth={depth}>
            {renderInlineTokens(inner, fences, codes, images, depth + 1, false)}
          </strong>
        ),
        end: boldStar.contentEnd + 2,
      };
    }
  }
  // Highlight unclosed **bold — always render (streaming preview)
  if (highlight && text.slice(pos, pos + 2) === '**') {
    const content = text.slice(pos + 2);
    if (content.length > 0) {
      return {
        node: (
          <strong key={`b${pos}`} data-depth={depth}>
            <span key={`b${pos}t`} className="md-opening-tag">
              {'**'}
            </span>
            {renderInlineTokens(content, fences, codes, images, depth + 1, false)}
          </strong>
        ),
        end: text.length,
      };
    }
  }

  // Priority 2: __bold__ at word boundary
  const boldUnder = matchDelim(text, pos, '__');
  if (
    boldUnder !== null &&
    isWordBoundaryBefore(text, pos) &&
    isWordBoundaryAfter(text, boldUnder.contentEnd + 2)
  ) {
    const inner = text.slice(boldUnder.contentStart, boldUnder.contentEnd);
    if (isValidEmphContent(inner)) {
      return {
        node: (
          <strong key={`B${pos}`} data-depth={depth}>
            {renderInlineTokens(inner, fences, codes, images, depth + 1, false)}
          </strong>
        ),
        end: boldUnder.contentEnd + 2,
      };
    }
  }
  // Highlight unclosed __bold__ at word boundary
  if (
    highlight &&
    text.slice(pos, pos + 2) === '__' &&
    isWordBoundaryBefore(text, pos) &&
    isWordBoundaryAfter(text, pos + 2)
  ) {
    const content = text.slice(pos + 2);
    if (content.length > 0) {
      return {
        node: (
          <strong key={`B${pos}`} data-depth={depth}>
            <span key={`B${pos}t`} className="md-opening-tag">
              {'__'}
            </span>
            {renderInlineTokens(content, fences, codes, images, depth + 1, false)}
          </strong>
        ),
        end: text.length,
      };
    }
  }

  // Priority 3: *italic*
  const italStar = matchDelim(text, pos, '*');
  if (italStar !== null) {
    const inner = text.slice(italStar.contentStart, italStar.contentEnd);
    if (isValidEmphContent(inner)) {
      return {
        node: (
          <em key={`i${pos}`} data-depth={depth}>
            {renderInlineTokens(inner, fences, codes, images, depth + 1, false)}
          </em>
        ),
        end: italStar.contentEnd + 1,
      };
    }
  }
  // Highlight unclosed *italic* (but not if ** was already checked above)
  if (highlight && text.charCodeAt(pos) === 0x2a && text.charCodeAt(pos + 1) !== 0x2a) {
    const content = text.slice(pos + 1);
    if (content.length > 0) {
      return {
        node: (
          <em key={`i${pos}`} data-depth={depth}>
            <span key={`i${pos}t`} className="md-opening-tag">
              {'*'}
            </span>
            {renderInlineTokens(content, fences, codes, images, depth + 1, false)}
          </em>
        ),
        end: text.length,
      };
    }
  }

  // Priority 4: _italic_ at word boundary
  const italUnder = matchDelim(text, pos, '_');
  if (italUnder !== null && isWordBoundaryBefore(text, pos)) {
    const inner = text.slice(italUnder.contentStart, italUnder.contentEnd);
    if (isValidEmphContent(inner)) {
      return {
        node: (
          <em key={`I${pos}`} data-depth={depth}>
            {renderInlineTokens(inner, fences, codes, images, depth + 1, false)}
          </em>
        ),
        end: italUnder.contentEnd + 1,
      };
    }
  }
  // Highlight unclosed _italic_ at word boundary
  if (highlight && text.charCodeAt(pos) === 0x5f && isWordBoundaryBefore(text, pos)) {
    const content = text.slice(pos + 1);
    if (content.length > 0) {
      return {
        node: (
          <em key={`I${pos}`} data-depth={depth}>
            <span key={`I${pos}t`} className="md-opening-tag">
              {'_'}
            </span>
            {renderInlineTokens(content, fences, codes, images, depth + 1, false)}
          </em>
        ),
        end: text.length,
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

function isWordBoundaryAfter(text: string, pos: number): boolean {
  if (pos >= text.length) return true;
  const next = text[pos];
  if (next === undefined) return true;
  return /\s/.test(next) || /[.,!?;:)]/.test(next);
}

function isValidEmphContent(s: string): boolean {
  return s.length > 0 && !/^\s/.test(s) && !/\s$/.test(s);
}

// Find next position >= from where a special char (\x00, *, _, `) appears.
function findNextSpecial(text: string, from: number): number {
  for (let i = from; i < text.length; i++) {
    const ch = text.charCodeAt(i);
    if (
      ch === 0 ||
      ch === 0x22 ||
      ch === 0x2a ||
      ch === 0x5f ||
      ch === 0x60 ||
      ch === 0x201c ||
      ch === 0x201d
    ) {
      return i;
    }
  }
  return text.length;
}
