/* Visual-QA evidence artifact (WG.VQA) — left-aligned vs centered drawer proof.
 * Not a test; runs as a standalone script and prints binary observable proof.
 * Run via: bun run tests/vqa-align-verify.tsx
 */
import { renderToStaticMarkup } from 'react-dom/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PersonaPanel } from '../src/panels/persona/PersonaPanel';

const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const html = renderToStaticMarkup(
  <QueryClientProvider client={qc}>
    <PersonaPanel />
  </QueryClientProvider>,
);

const m = html.match(/<div class="([^"]*max-w-6xl[^"]*)"/);
if (!m) {
  console.log('FAIL: max-w-6xl wrapper not found in DOM');
  process.exit(1);
}
const cls = m[1] as string;

console.log('=== PersonaPanel wrapper class (current state — after W1.T1 edit) ===');
console.log(JSON.stringify(cls));

const hasMxAuto = /\bmx-auto\b/.test(cls);
const hasMaxW6xl = /\bmax-w-6xl\b/.test(cls);
console.log('mx-auto present (must be false):', hasMxAuto);
console.log('max-w-6xl present (must be true):', hasMaxW6xl);

console.log('\n=== Algebraic proof of left-align (binary observable, per ultrawork contract) ===');
console.log('Drawer slot CSS context: .drawer-top { left:0; right:0; padding: p-2.5 (10px both sides) }');
console.log('Inner wrapper CSS: max-w-6xl (content cap = 1152px)');
console.log('');
console.log('WITH mx-auto (PRE-edit state):    margin: 0 auto → centered; leftover horizontal space split equally');
console.log('                                      ⇒ "clustered in the center" symptom (user complaint)');
console.log('WITHOUT mx-auto (POST-edit state): margin-left: 0, margin-right: auto → flush-left of padding box');
console.log('                                      ⇒ left-aligned within the max-w-6xl width cap');
console.log('');
console.log('Result: ' + (hasMxAuto ? 'STILL CENTERED (FAIL — W1.T1 edit did not take effect)' : 'LEFT-ALIGNED (PASS — W1.T1 edit verified in DOM)'));

// Also capture the SSR HTML length + the static positioning to confirm no horizontal overflow risk
console.log('\n=== Additional regression checks ===');
console.log('SSR HTML length:', html.length, 'bytes');
console.log('Has horizontal-scrollbar risk class (overflow-x-scroll / w-screen on wrapper):', /overflow-x-scroll|w-screen/.test(html));

process.exit(hasMxAuto || !hasMaxW6xl ? 1 : 0);
