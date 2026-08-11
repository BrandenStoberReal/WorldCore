import { describe, it, expect } from 'bun:test';
import { renderToString } from 'react-dom/server';
import { renderMarkdown } from '../src/lib/markdown';

function render(node: ReturnType<typeof renderMarkdown>): string {
  if (node === null || node === undefined) return '';
  return renderToString(node);
}

function renderWarnings(
  input: string,
  options?: Parameters<typeof renderMarkdown>[1],
): { html: string; warnings: string[] } {
  const warnings: string[] = [];
  const orig = console.error;
  console.error = (...a) => warnings.push(a.map(String).join(' '));
  try {
    const html = render(renderMarkdown(input, options));
    return { html, warnings };
  } finally {
    console.error = orig;
  }
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
    expect(html).toContain('<strong');
    expect(html).toContain('bold</strong>');
  });

  it('renders *italic* as <em>', () => {
    const html = render(renderMarkdown('*italic*'));
    expect(html).toContain('<em');
    expect(html).toContain('italic</em>');
  });

  it('does NOT italicize * text * with whitespace inside markers', () => {
    const html = render(renderMarkdown('* text *'));
    expect(html).not.toContain('<em>');
    expect(html).toContain('* text *');
  });

  it('renders _italic_ at word boundary as <em>', () => {
    const html = render(renderMarkdown('_italic_'));
    expect(html).toContain('<em');
    expect(html).toContain('italic</em>');
  });

  it('does NOT italicize foo_bar_baz (literalMidWordUnderscores)', () => {
    const html = render(renderMarkdown('foo_bar_baz'));
    expect(html).not.toContain('<em>');
    expect(html).toContain('foo_bar_baz');
  });

  it('renders __bold__ at word boundary as <strong>', () => {
    const html = render(renderMarkdown('__bold__'));
    expect(html).toContain('<strong');
    expect(html).toContain('bold</strong>');
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
    expect(html).toContain('<strong');
    expect(html).toContain('<em');
    expect(html).toContain('italic</em>');
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
    expect(html).toContain('<em');
    expect(html).toContain('narration</em>');
    expect(html).toContain('<strong');
    expect(html).toContain('important</strong>');
    expect(html).toContain('says');
    expect(html).toContain('things');
  });

  it('does NOT bold __bold__ mid-word (foo__bold__baz)', () => {
    const html = render(renderMarkdown('foo__bold__baz'));
    expect(html).not.toContain('<strong>');
    expect(html).toContain('foo__bold__baz');
  });

  describe('highlightOpeningTags', () => {
    it('renders unclosed **bold with opening tag marker', () => {
      const html = render(renderMarkdown('**bold text', { highlightOpeningTags: true }));
      expect(html).toContain('md-opening-tag');
      expect(html).toContain('**');
      expect(html).toContain('<strong');
      expect(html).toContain('bold text</strong>');
    });

    it('renders unclosed *italic with opening tag marker', () => {
      const html = render(renderMarkdown('*italic text', { highlightOpeningTags: true }));
      expect(html).toContain('md-opening-tag');
      expect(html).toContain('<em');
      expect(html).toContain('italic text</em>');
    });

    it('renders unclosed `code with opening tag marker', () => {
      const html = render(renderMarkdown('`inline code', { highlightOpeningTags: true }));
      expect(html).toContain('md-opening-tag');
      expect(html).toContain('<code>inline code</code>');
    });

    it('renders single-line * Hello world as emphasis when highlighting (not enough lines for list)', () => {
      const html = render(renderMarkdown('* Hello world', { highlightOpeningTags: true }));
      expect(html).toContain('<em');
      expect(html).toContain('Hello world</em>');
    });

    it('renders closed **bold** normally with highlighting enabled', () => {
      const html = render(renderMarkdown('**bold text**', { highlightOpeningTags: true }));
      expect(html).not.toContain('md-opening-tag');
      expect(html).toContain('<strong');
      expect(html).toContain('bold text</strong>');
    });

    it('renders closed `code` normally with highlighting enabled', () => {
      const html = render(renderMarkdown('`inline code`', { highlightOpeningTags: true }));
      expect(html).not.toContain('md-opening-tag');
      expect(html).toContain('<code>inline code</code>');
    });

    it('without highlightOpeningTags, unclosed delimiters are literal (backward compat)', () => {
      const html = render(renderMarkdown('**bold text'));
      expect(html).not.toContain('md-opening-tag');
      expect(html).not.toContain('<strong>');
      expect(html).toContain('**bold text');
    });

    it('stops unclosed code highlight at newline', () => {
      const html = render(renderMarkdown('`code\nmore text', { highlightOpeningTags: true }));
      expect(html).toContain('md-opening-tag');
      expect(html).toContain('<code>code</code>');
      expect(html).toContain('more text');
    });
  });

  it('renders emphasis inside dialogue quotes', () => {
    const html = render(renderMarkdown('"You didn\'t need to say it like *that*!"'));
    expect(html).toContain('var(--dialogue)');
    expect(html).toContain('<em');
    expect(html).toContain('that</em>');
  });

  it('renders curly quotes with dialogue color and nested emphasis', () => {
    const html = render(renderMarkdown('\u201cHello *world*\u201d'));
    expect(html).toContain('var(--dialogue)');
    expect(html).toContain('<em');
    expect(html).toContain('world</em>');
  });

  it('highlights unclosed opening quote when highlightOpeningTags is true', () => {
    const html = render(renderMarkdown('"Crazy?!', { highlightOpeningTags: true }));
    expect(html).toContain('var(--dialogue)');
    expect(html).toContain('Crazy?!');
  });

  it('does NOT highlight unclosed quote without highlightOpeningTags', () => {
    const html = render(renderMarkdown('"Crazy?!'));
    expect(html).not.toContain('var(--dialogue)');
    expect(html).toContain('&quot;Crazy?!');
  });

  describe('hardening regressions', () => {
    describe('list detection — all non-blank lines must match', () => {
      it('does NOT treat a single-line paragraph starting with "* " as a list', () => {
        const html = render(renderMarkdown('* Hello world'));
        expect(html).not.toContain('<ul');
        expect(html).not.toContain('<ol');
        expect(html).toContain('*');
        expect(html).toContain('Hello world');
      });

      it('does NOT treat a 2-line paragraph whose lines both start with "-" as a list when other lines are prose', () => {
        const html = render(renderMarkdown('- dash one\nprose line\n- dash two'));
        expect(html).not.toContain('<ul');
        expect(html).toContain('prose line');
      });

      it('renders a real 2-item unordered list', () => {
        const html = render(renderMarkdown('- one\n- two'));
        expect(html).toContain('<ul');
        expect(html).toContain('<li');
        expect(html).toContain('one');
        expect(html).toContain('two');
      });

      it('renders a real 2-item ordered list', () => {
        const html = render(renderMarkdown('1. one\n2. two'));
        expect(html).toContain('<ol');
        expect(html).toContain('one');
        expect(html).toContain('two');
      });

      it('treats blank list-item lines as continuation, not as a list-breaker', () => {
        const html = render(renderMarkdown('- one\n\n- two'));
        expect(html).toContain('<ul');
        expect(html).toContain('one');
        expect(html).toContain('two');
      });

      it('rejects mixed 1 ul + 1 ol + 1 prose as not-a-list (was majority-vote bug)', () => {
        const html = render(renderMarkdown('- bullet\n1. ord\ntext'));
        expect(html).not.toContain('<ul');
        expect(html).not.toContain('<ol');
      });
    });

    describe('numeric HTML entities — never throw', () => {
      it('does not throw on out-of-range numeric entity', () => {
        expect(() => render(renderMarkdown('&#xFFFFFFFF;'))).not.toThrow();
        expect(() => render(renderMarkdown('&#9999999999;'))).not.toThrow();
        expect(() => render(renderMarkdown('&#x110000;'))).not.toThrow();
      });

      it('decodes valid numeric entities', () => {
        const html = render(renderMarkdown('&#65; &#x42; &#39;'));
        expect(html).toContain('A');
        expect(html).toContain('B');
        expect(html).not.toContain('&#39;');
      });

      it('leaves malformed numeric entity as literal text (not swallowed)', () => {
        const html = render(renderMarkdown('&#xZZZ;'));
        expect(html).not.toContain('<em');
        expect(html).toContain('ZZZ');
      });

      it('leaves out-of-range numeric entity as literal text', () => {
        const html = render(renderMarkdown('&#xFFFFFFFF;'));
        expect(html).toContain('FFFFFFFF');
        expect(html).not.toContain('<em');
      });
    });

    describe('fenced code — consistent trailing newline handling', () => {
      it('does not include the newline before the closing fence in code content', () => {
        const html = render(renderMarkdown('```js\nconst x = 1;\n```'));
        expect(html).toContain('const x = 1;');
        expect(html).not.toContain('const x = 1;\n');
      });

      it('preserves a blank line INSIDE the code block content', () => {
        const html = render(renderMarkdown('```\nfoo\n\nbar\n```'));
        expect(html).toContain('foo');
        expect(html).toContain('bar');
      });

      it('does not append a stray trailing newline to a blank-line-terminated code block', () => {
        const html = render(renderMarkdown('```\nfoo\n\n```'));
        expect(html).toContain('foo');
      });
    });

    describe('image URL hardening (allowExternalMedia only)', () => {
      it('rejects javascript: scheme image URL', () => {
        const html = render(
          renderMarkdown('![x](javascript:alert(1))', { allowExternalMedia: true }),
        );
        expect(html).not.toContain('<img');
      });

      it('rejects vbscript: scheme image URL', () => {
        const html = render(
          renderMarkdown('![x](vbscript:msgbox(1))', { allowExternalMedia: true }),
        );
        expect(html).not.toContain('<img');
      });

      it('rejects file: scheme image URL', () => {
        const html = render(
          renderMarkdown('![x](file:///etc/passwd)', { allowExternalMedia: true }),
        );
        expect(html).not.toContain('<img');
      });

      it('accepts http image URL with querystring ampersands', () => {
        const html = render(
          renderMarkdown('![x](http://example.com/i.png?a=1&b=2)', { allowExternalMedia: true }),
        );
        expect(html).toContain('<img');
        expect(html).toContain('a=1&amp;b=2');
      });

      it('accepts https image URL', () => {
        const html = render(
          renderMarkdown('![x](https://example.com/i.png)', { allowExternalMedia: true }),
        );
        expect(html).toContain('<img');
        expect(html).toContain('https://example.com/i.png');
      });

      it('accepts data:image/** URL', () => {
        const html = render(
          renderMarkdown('![x](data:image/png;base64,iVBOR=)', { allowExternalMedia: true }),
        );
        expect(html).toContain('<img');
        expect(html).toContain('data:image/png');
      });

      it('accepts root-relative image URL', () => {
        const html = render(renderMarkdown('![x](/img/cat.png)', { allowExternalMedia: true }));
        expect(html).toContain('<img');
        expect(html).toContain('/img/cat.png');
      });

      it('rejects data:text/html URL (not an image media type)', () => {
        const html = render(
          renderMarkdown('![x](data:text/html,<script>)', { allowExternalMedia: true }),
        );
        expect(html).not.toContain('<img');
      });

      it('does NOT render images when allowExternalMedia is false', () => {
        const html = render(renderMarkdown('![x](https://example.com/i.png)'));
        expect(html).not.toContain('<img');
      });
    });

    describe('blockquote lazy continuation', () => {
      it('detects blockquote whose subsequent line has no space after >', () => {
        const html = render(renderMarkdown('> first\n>second'));
        expect(html).toContain('<blockquote>');
        expect(html).toContain('first');
        expect(html).toContain('second');
      });

      it('treats a paragraph line inside a blockquote block as continuation, not a new block', () => {
        const html = render(renderMarkdown('> quote line\ncontinued prose'));
        expect(html).toContain('<blockquote>');
        expect(html).toContain('quote line');
        expect(html).toContain('continued prose');
      });

      it('preserves nested blockquote recursion depth', () => {
        const html = render(renderMarkdown('> > nested'));
        expect(html).toContain('<blockquote>');
      });
    });

    describe('inline code fallback path (was dead code)', () => {
      it('renders a closed inline code span via the in-loop matcher even when placeholder extraction is bypassed', () => {
        const html = render(renderMarkdown('line `code` end'));
        expect(html).toContain('<code>code</code>');
        expect(html).toContain('line');
        expect(html).toContain('end');
      });

      it('does not injest a stray ` as opening of an italic accent', () => {
        const html = render(renderMarkdown('foo ` bar'));
        expect(html).not.toContain('<code>');
        expect(html).toContain('`');
      });

      it('renders a single closed backtick pair with empty content as a literal pair of backticks', () => {
        const html = render(renderMarkdown('``'));
        expect(html).toContain('``');
        expect(html).not.toContain('<code>');
      });

      it('renders open-then-close in same line (cross-paragraph resilience)', () => {
        const html = render(renderMarkdown('a `b` c `d` e'));
        expect(html).toContain('<code>b</code>');
        expect(html).toContain('<code>d</code>');
      });
    });

    describe('placeholder NUL-byte collision', () => {
      it('rejects a literal NUL byte in input rather than rendering a stale extracted fence', () => {
        const input = '```\ninside\n```\n' + '\u0000FENCE0\u0000';
        const html = render(renderMarkdown(input));
        const preCount = (html.match(/<pre/g) || []).length;
        expect(preCount).toBe(1);
        expect(html).toContain('inside');
      });

      it('does not crash on a stray NUL byte mid-paragraph', () => {
        expect(() => render(renderMarkdown('hello\u0000world'))).not.toThrow();
      });
    });

    describe('curly-quote dialogue handling', () => {
      it('treats opening curly quote U+201C as a dialogue quote', () => {
        const html = render(renderMarkdown('\u201cHello world\u201d'));
        expect(html).toContain('var(--dialogue)');
        expect(html).toContain('Hello world');
      });

      it('renders nested emphasis inside curly quotes', () => {
        const html = render(renderMarkdown('\u201cHello *world*\u201d'));
        expect(html).toContain('var(--dialogue)');
        expect(html).toContain('<em');
        expect(html).toContain('world</em>');
      });

      it('renders unclosed curly quote with highlight option', () => {
        const html = render(renderMarkdown('\u201cHello world', { highlightOpeningTags: true }));
        expect(html).toContain('var(--dialogue)');
        expect(html).toContain('Hello world');
      });
    });

    describe('nested same-kind quote key collision', () => {
      it('renders nested straight quotes without producing React duplicate-key warnings', () => {
        const { html, warnings } = renderWarnings('a "x "y" z" b', { highlightOpeningTags: true });
        expect(warnings.some((w) => /encountered two children with the same key/i.test(w))).toBe(
          false,
        );
      });

      it('renders nested curly quotes without duplicate-key warnings', () => {
        const { html, warnings } = renderWarnings('a \u201cx \u201cy\u201d z\u201d b', {
          highlightOpeningTags: true,
        });
        expect(warnings.some((w) => /encountered two children with the same key/i.test(w))).toBe(
          false,
        );
      });

      it('renders nested mixed quotes without duplicate-key warnings', () => {
        const { html, warnings } = renderWarnings('a "x \u201cy\u201d z" b', {
          highlightOpeningTags: true,
        });
        expect(warnings.some((w) => /encountered two children with the same key/i.test(w))).toBe(
          false,
        );
      });
    });

    describe('matchDelim adversarial performance', () => {
      it('completes in reasonable time on adversarial many-* input', () => {
        const big = '*a*b*c*d*e*f*g*h*i*j*k*l*m*n*o*p*q*r*s*t*u*v*w*x*y*z*';
        const start = Date.now();
        const html = render(renderMarkdown(big));
        const elapsed = Date.now() - start;
        expect(elapsed).toBeLessThan(2000);
      });

      it('completes in reasonable time on adversarial many-_ input', () => {
        const big = '_a_b_c_d_e_f_g_h_i_j_k_l_m_n_o_p_q_r_s_t_u_v_w_x_y_z_';
        const start = Date.now();
        const html = render(renderMarkdown('a ' + big + ' b'));
        const elapsed = Date.now() - start;
        expect(elapsed).toBeLessThan(2000);
      });
    });
  });
});
