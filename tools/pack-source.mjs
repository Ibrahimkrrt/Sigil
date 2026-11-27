// Zips the project's source into public/export/sigil-angular-source.zip, which the Studio
// offers as its "Source code" export. Dependencies, build output and generated files are left out.
// The archive is written by the application's own zip function, bundled here on the fly,
// so there is one zip writer in the project. Usage: node tools/pack-source.mjs
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { build } from 'esbuild';

const bundle = await build({ entryPoints: ['src/app/domain/zip/zip-store.ts'], bundle: true, format: 'esm', write: false, logLevel: 'silent' });
const { zipStore } = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);

const SKIP = new Set(['node_modules', 'dist', '.angular', '.git', 'out-tsc', 'coverage', 'E2E-RESULTS.md']);
const walk = async (dir) => (await Promise.all((await readdir(dir, { withFileTypes: true }))
  .filter((entry) => !SKIP.has(entry.name) && path.join(dir, entry.name) !== path.join('public', 'export'))
  .map((entry) => (entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)])))).flat();
// The archive is the reusable engine with its demo. The personal CVs published beside the demo
// (public/<name>.cv.json) and the images they name stay out of it.
const personal = new Set();
for (const entry of await readdir('public')) {
  if (!entry.endsWith('.cv.json')) continue;
  personal.add(`public/${entry}`);
  for (const image of (await readFile(path.join('public', entry), 'utf8')).match(/"[^"]+\.(?:png|jpe?g|gif|webp|avif|svg)"/gi) ?? []) personal.add(`public/${image.slice(1, -1).replace(/^\.?\//, '')}`);
}
const names = (await walk('.')).map((name) => name.split(path.sep).join('/')).filter((name) => !personal.has(name)).sort();
const files = await Promise.all(names.map(async (name) => ({ name: `sigil-angular/${name}`, data: new Uint8Array(await readFile(name)) })));
const archive = zipStore(files);
await mkdir('public/export', { recursive: true });
await writeFile('public/export/sigil-angular-source.zip', archive);
console.log(`public/export/sigil-angular-source.zip  ${files.length} files, ${(archive.length / 1024).toFixed(0)} kB`);
