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
// Extensions ship raw .ts/.tsx source. Browsers can't load them as-is:
// bare `import 'react'` specifiers don't resolve, `.tsx` isn't valid JS,
// and per-module transpile can't bundle CSS imports. So the build bundles
// each extension's manifest entrypoint (eg. index.tsx) into a single
// self-contained ES module at dist/extensions/<extId>/index.js.
//
// Both global (data/extensions/) and user (data/*/extensions/) extensions
// are built. User extensions take precedence on id collision.
const DATA_ROOT = path.join(process.cwd(), 'data');
const extDirMap = new Map<string, string>(); // extId → source dir

const globalExtRoot = path.join(DATA_ROOT, 'extensions');
try {
  const entries = await readdir(globalExtRoot, { withFileTypes: true });
  for (const e of entries) {
    if (e.isDirectory() && /^[a-z0-9-]+$/.test(e.name)) {
      extDirMap.set(e.name, path.join(globalExtRoot, e.name));
    }
  }
} catch {}

try {
  const userDirs = await readdir(DATA_ROOT, { withFileTypes: true });
  for (const u of userDirs) {
    if (!u.isDirectory() || u.name === 'extensions') continue;
    const userExtRoot = path.join(DATA_ROOT, u.name, 'extensions');
    try {
      const entries = await readdir(userExtRoot, { withFileTypes: true });
      for (const e of entries) {
        if (e.isDirectory() && /^[a-z0-9-]+$/.test(e.name)) {
          extDirMap.set(e.name, path.join(userExtRoot, e.name));
        }
      }
    } catch {}
  }
} catch {}

const extDirs = [...extDirMap.entries()].map(([id, dir]) => ({ id, dir }));

for (const { id: extId, dir: extDir } of extDirs) {
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
    await copyFile(path.join(extDir, manifest.css), path.join(extOutDir, manifest.css));
  }

  for (const output of extResult.outputs) {
    console.log(
      ` ${path.relative(process.cwd(), output.path)}  ${(output.size / 1024).toFixed(1)} KB`,
    );
  }
}
