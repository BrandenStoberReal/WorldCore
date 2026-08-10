import tailwind from 'bun-plugin-tailwind';
import { rm, readdir, mkdir, copyFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const outdir = path.join(process.cwd(), 'dist');
await rm(outdir, { recursive: true, force: true });

const entrypoints = [...new Bun.Glob('src/**/*.html').scanSync()];

const result = await Bun.build({
  entrypoints,
  outdir,
  plugins: [tailwind],
  minify: true,
  target: 'browser',
  sourcemap: 'linked',
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
});

for (const output of result.outputs) {
  console.log(
    ` ${path.relative(process.cwd(), output.path)}  ${(output.size / 1024).toFixed(1)} KB`,
  );
}

// === Extension build pass ===
//
// Preinstalled extensions live under data/extensions/<extId>/ and ship raw
// .ts/.tsx source. Browsers can't load them as-is: bare `import 'react'`
// specifiers don't resolve, `.tsx` isn't valid JS, and per-module transpile
// can't bundle CSS imports. So the build bundles each extension's manifest
// entrypoint (eg. index.tsx) into a single self-contained ES module at
// dist/extensions/<extId>/index.js. The asset route serves these built
// artifacts, mapping the source manifest's `js` field onto the built .js.
//
// CSS is copied verbatim into dist/extensions/<extId>/ so the loader's existing
// `assetUrl(extId, manifest.css)` path still resolves.
const extensionsRoot = path.join(process.cwd(), 'data', 'extensions');
let extEntries: import('node:fs').Dirent[] = [];
try {
  extEntries = await readdir(extensionsRoot, { withFileTypes: true });
} catch {
  extEntries = [];
}
const extDirs = extEntries.filter((e) => e.isDirectory() && /^[a-z0-9-]+$/.test(e.name));

for (const dir of extDirs) {
  const extId = dir.name;
  const extDir = path.join(extensionsRoot, extId);
  const manifestPath = path.join(extDir, 'manifest.json');
  if (!existsSync(manifestPath)) continue;

  let manifest: { js?: string; css?: string };
  try {
    manifest = JSON.parse(await Bun.file(manifestPath).text());
  } catch {
    console.warn(` [ext] skipping "${extId}" (unreadable manifest)`);
    continue;
  }
  if (!manifest.js || !manifest.js.trim()) {
    console.warn(` [ext] skipping "${extId}" (no js entrypoint)`);
    continue;
  }

  const entry = path.join(extDir, manifest.js);
  if (!existsSync(entry)) {
    console.warn(` [ext] skipping "${extId}" (entrypoint ${manifest.js} missing)`);
    continue;
  }

  const extOutDir = path.join(outdir, 'extensions', extId);
  await mkdir(extOutDir, { recursive: true });

  const extResult = await Bun.build({
    entrypoints: [entry],
    outdir: extOutDir,
    target: 'browser',
    minify: true,
    sourcemap: 'external',
    naming: 'index.js',
    define: {
      'process.env.NODE_ENV': JSON.stringify('production'),
    },
  });

  if (!extResult.success) {
    for (const log of extResult.logs) console.error(` [ext:${extId}] ${log.message ?? log}`);
    continue;
  }

  if (manifest.css && existsSync(path.join(extDir, manifest.css))) {
    await copyFile(
      path.join(extDir, manifest.css),
      path.join(extOutDir, manifest.css),
    );
  }

  for (const output of extResult.outputs) {
    console.log(
      ` ${path.relative(process.cwd(), output.path)}  ${(output.size / 1024).toFixed(1)} KB`,
    );
  }
}
