const MERMAID_CDN = 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js';
const EXT_ID = 'mermaid-diagrams';

let mermaidLoaded = false;
let mermaidReady: Promise<void> | null = null;

function loadMermaid(): Promise<void> {
  if (mermaidReady) return mermaidReady;
  mermaidReady = new Promise<void>((resolve, reject) => {
    if (mermaidLoaded) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = MERMAID_CDN;
    script.onload = () => {
      mermaidLoaded = true;
      const g = globalThis as Record<string, unknown>;
      const mermaid = (g as { mermaid?: { initialize?: (cfg: Record<string, unknown>) => void } }).mermaid;
      if (mermaid?.initialize) {
        mermaid.initialize({
          startOnLoad: false,
          theme: 'dark',
          securityLevel: 'loose',
          fontFamily: 'inherit',
        });
      }
      resolve();
    };
    script.onerror = () => reject(new Error('Failed to load Mermaid'));
    document.head.appendChild(script);
  });
  return mermaidReady;
}

function findMermaidBlocks(root: Element): Element[] {
  const blocks: Element[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
  let node = walker.nextNode();
  while (node) {
    const el = node as HTMLElement;
    if (
      el.tagName === 'PRE' &&
      el.querySelector('code')?.classList.contains('language-mermaid')
    ) {
      blocks.push(el);
    }
    node = walker.nextNode();
  }
  return blocks;
}

async function renderBlock(pre: Element): Promise<void> {
  const code = pre.querySelector('code');
  if (!code) return;
  const text = code.textContent?.trim();
  if (!text) return;

  const id = `mermaid-${Math.random().toString(36).slice(2, 10)}`;
  const container = document.createElement('div');
  container.className = 'mermaid-rendered';
  container.dataset.ext = EXT_ID;

  try {
    await loadMermaid();
    const g = globalThis as Record<string, unknown>;
    const mermaid = (g as { mermaid?: { render: (id: string, text: string) => Promise<{ svg: string }> } }).mermaid;
    if (!mermaid?.render) {
      container.textContent = text;
      container.classList.add('mermaid-error');
    } else {
      const { svg } = await mermaid.render(id, text);
      container.innerHTML = svg;
    }
  } catch (err) {
    container.textContent = text;
    container.classList.add('mermaid-error');
  }

  pre.replaceWith(container);
}

function processNewNodes(root: Element): void {
  const blocks = findMermaidBlocks(root);
  for (const block of blocks) {
    renderBlock(block);
  }
}

function observeChat(): void {
  const target = document.querySelector('[data-panel="chat"]') ?? document.body;
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node instanceof HTMLElement) {
          processNewNodes(node);
        }
      }
    }
  });
  observer.observe(target, { childList: true, subtree: true });
  processNewNodes(target);
}

observeChat();

const g = globalThis as Record<string, unknown>;
const activate = g.__WorldCore_activate__ as ((id: string) => void) | undefined;
if (activate) activate(EXT_ID);
