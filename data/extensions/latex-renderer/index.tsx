const KATEX_CSS = 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css';
const KATEX_JS = 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js';
const KATEX_AUTO = 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/contrib/auto-render.min.js';
const EXT_ID = 'latex-renderer';

let katexLoaded = false;
let katexReady: Promise<void> | null = null;

function loadCSS(href: string): Promise<void> {
  return new Promise((resolve) => {
    if (document.querySelector(`link[href="${href}"]`)) {
      resolve();
      return;
    }
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.onload = () => resolve();
    link.onerror = () => resolve();
    document.head.appendChild(link);
  });
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}

function loadKatex(): Promise<void> {
  if (katexReady) return katexReady;
  katexReady = (async () => {
    if (katexLoaded) return;
    await Promise.all([
      loadCSS(KATEX_CSS),
      loadScript(KATEX_JS),
      loadScript(KATEX_AUTO),
    ]);
    katexLoaded = true;
  })();
  return katexReady;
}

function isInsideCodeBlock(el: Element): boolean {
  let parent = el.parentElement;
  while (parent) {
    if (parent.tagName === 'PRE' || parent.tagName === 'CODE') return true;
    parent = parent.parentElement;
  }
  return false;
}

function processElement(el: Element): void {
  if (isInsideCodeBlock(el)) return;
  if (el.querySelector('.katex-rendered, .katex-error')) return;

  const text = el.textContent;
  if (!text) return;
  if (!text.includes('$')) return;

  const g = globalThis as Record<string, unknown>;
  const katex = g.katex as
    | { renderToString: (expr: string, opts: Record<string, unknown>) => string }
    | undefined;
  const renderMathInElement = (g as { renderMathInElement?: (el: Element, opts: Record<string, unknown>) => void })
    .renderMathInElement;

  if (!katex || !renderMathInElement) return;

  try {
    renderMathInElement(el, {
      delimiters: [
        { left: '$$', right: '$$', display: true },
        { left: '$', right: '$', display: false },
        { left: '\\[', right: '\\]', display: true },
        { left: '\\(', right: '\\)', display: false },
      ],
      throwOnError: false,
      trust: true,
    });
    el.classList.add('katex-rendered');
  } catch {
    el.classList.add('katex-error');
  }
}

function processNewNodes(root: Element): void {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const seen = new Set<Element>();
  let node = walker.nextNode();
  while (node) {
    const parent = node.parentElement;
    if (parent && !seen.has(parent)) {
      seen.add(parent);
      processElement(parent);
    }
    node = walker.nextNode();
  }
}

function observeChat(): void {
  const target = document.querySelector('[data-panel="chat"]') ?? document.body;
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const added of mutation.addedNodes) {
        if (added instanceof HTMLElement) {
          processNewNodes(added);
        }
      }
    }
  });
  observer.observe(target, { childList: true, subtree: true });
  processNewNodes(target);
}

loadKatex().then(() => {
  observeChat();
  const g = globalThis as Record<string, unknown>;
  const activate = g.__WorldCore_activate__ as ((id: string) => void) | undefined;
  if (activate) activate(EXT_ID);
});
