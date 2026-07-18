import { describe, it, expect } from 'bun:test';
import { renderToString } from 'react-dom/server';
import { renderMarkdown } from '../src/lib/markdown';

function render(node: ReturnType<typeof renderMarkdown>): string {
  if (node === null || node === undefined) return '';
  return renderToString(node);
}

describe('renderMarkdown', () => {
  it('returns null for empty string', () => {
    expect(renderMarkdown('')).toBeNull();
  });

  it('renders plain text as a paragraph', () => {
    const html = render(renderMarkdown('Hello world'));
    expect(html).toContain('Hello world');
    expect(html).toContain('<p>');
  });

  it('renders **bold** as <strong>', () => {
    const html = render(renderMarkdown('**bold**'));
    expect(html).toContain('<strong>bold</strong>');
  });

  it('renders *italic* as <em>', () => {
    const html = render(renderMarkdown('*italic*'));
    expect(html).toContain('<em>italic</em>');
  });

  it('does NOT italicize * text * with whitespace inside markers', () => {
    const html = render(renderMarkdown('* text *'));
    expect(html).not.toContain('<em>');
    expect(html).toContain('* text *');
  });

  it('renders _italic_ at word boundary as <em>', () => {
    const html = render(renderMarkdown('_italic_'));
    expect(html).toContain('<em>italic</em>');
  });

  it('does NOT italicize foo_bar_baz (literalMidWordUnderscores)', () => {
    const html = render(renderMarkdown('foo_bar_baz'));
    expect(html).not.toContain('<em>');
    expect(html).toContain('foo_bar_baz');
  });

  it('renders __bold__ at word boundary as <strong>', () => {
    const html = render(renderMarkdown('__bold__'));
    expect(html).toContain('<strong>bold</strong>');
  });

  it('renders inline code as <code>', () => {
    const html = render(renderMarkdown('`inline code`'));
    expect(html).toContain('<code>inline code</code>');
  });

  it('does NOT format content inside inline code', () => {
    const html = render(renderMarkdown('`**not bold**`'));
    expect(html).toContain('<code>');
    expect(html).not.toContain('<strong>');
  });

  it('renders fenced code block with language and content', () => {
    const html = render(renderMarkdown('```js\nconst x = 1;\n```'));
    expect(html).toContain('const x = 1;');
    expect(html).toContain('js');
    expect(html).toContain('<pre');
  });

  it('renders unclosed fenced block (streaming-safe)', () => {
    const html = render(renderMarkdown('```js\nconst x = 1;'));
    expect(html).toContain('const x = 1;');
  });

  it('renders unclosed backtick as literal text', () => {
    const html = render(renderMarkdown('`foo'));
    expect(html).not.toContain('<code>');
    expect(html).toContain('`foo');
  });

  it('renders blockquote', () => {
    const html = render(renderMarkdown('> OOC note'));
    expect(html).toContain('<blockquote>');
    expect(html).toContain('OOC note');
  });

  it('renders multi-line blockquote as single <blockquote>', () => {
    const html = render(renderMarkdown('> line one\n> line two'));
    expect(html).toContain('<blockquote>');
    expect(html).toContain('line one');
    expect(html).toContain('line two');
    const bqCount = (html.match(/<blockquote/g) || []).length;
    expect(bqCount).toBe(1);
  });

  it('renders single newline as <br>', () => {
    const html = render(renderMarkdown('line1\nline2'));
    expect(html).toContain('<br');
    expect(html).toContain('line1');
    expect(html).toContain('line2');
  });

  it('renders double newline as separate paragraphs', () => {
    const html = render(renderMarkdown('Para one\n\nPara two'));
    const pCount = (html.match(/<p/g) || []).length;
    expect(pCount).toBeGreaterThanOrEqual(2);
    expect(html).toContain('Para one');
    expect(html).toContain('Para two');
  });

  it('escapes HTML — no real <script> element in output', () => {
    const html = render(renderMarkdown('<script>alert(1)</script>'));
    expect(html).not.toContain('<script>');
    expect(html).toContain('alert(1)');
  });

  it('renders nested **bold *italic* bold** correctly', () => {
    const html = render(renderMarkdown('**bold *italic* bold**'));
    expect(html).toContain('<strong>');
    expect(html).toContain('<em>italic</em>');
  });

  it('renders unclosed **bold as literal asterisks', () => {
    const html = render(renderMarkdown('**unclosed'));
    expect(html).not.toContain('<strong>');
    expect(html).toContain('**unclosed');
  });

  it('renders multiple paragraphs from double newlines', () => {
    const html = render(renderMarkdown('Para one\n\nPara two'));
    expect(html).toContain('Para one');
    expect(html).toContain('Para two');
  });

  it('renders blockquote followed by paragraph', () => {
    const html = render(renderMarkdown('> quote\n\nprose'));
    expect(html).toContain('<blockquote>');
    expect(html).toContain('quote');
    expect(html).toContain('prose');
  });

  it('renders mixed emphasis correctly', () => {
    const html = render(renderMarkdown('*narration* says **important** things'));
    expect(html).toContain('<em>narration</em>');
    expect(html).toContain('<strong>important</strong>');
    expect(html).toContain('says');
    expect(html).toContain('things');
  });

  it('does NOT bold __bold__ mid-word (foo__bold__baz)', () => {
    const html = render(renderMarkdown('foo__bold__baz'));
    expect(html).not.toContain('<strong>');
    expect(html).toContain('foo__bold__baz');
  });
});
