// Packs the `standalone` build (one script, one stylesheet, no router) into a single HTML
// file with four placeholders, and puts it where the Studio can fetch it: public/export/viewer.html.
// The Studio fills the placeholders to make the "Standalone HTML" and "Interactive web CV" exports.
// Usage: ng build --configuration standalone && node tools/pack-viewer.mjs
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const dir = path.resolve('dist/standalone/browser');
const names = await readdir(dir);
const scripts = names.filter((name) => name.endsWith('.js'));
const styles = names.filter((name) => name.endsWith('.css'));
if (scripts.length !== 1 || styles.length !== 1) {
  throw new Error(`pack-viewer: expected one script and one stylesheet in ${dir}, found ${[...scripts, ...styles].join(', ') || 'none'}. A lazy import in the viewer splits the bundle; a single file cannot load chunks.`);
}
// Nothing in the inlined code may close its own element early.
const script = (await readFile(path.join(dir, scripts[0]), 'utf8')).replace(/<\/script/gi, '<\\/script');
const style = (await readFile(path.join(dir, styles[0]), 'utf8')).replace(/<\/style/gi, '<\\/style');
if (script.includes('"__SIGIL_DATA__"') || script.includes('"__SIGIL_ASSETS__"')) throw new Error('pack-viewer: the viewer bundle contains an export placeholder; the Studio would fill the wrong one.');
const fonts = /<link rel="stylesheet" href="(https:\/\/fonts\.googleapis\.com\/[^"]+)">/.exec(await readFile('src/index.html', 'utf8'))?.[1];

const html = `<!doctype html>
<html lang="en" data-sigil-lang>
<head>
<meta charset="utf-8">
<title>Sigil CV</title>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="generator" content="Sigil CV, Angular edition">
${fonts ? `<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n<link rel="stylesheet" href="${fonts}">` : ''}
<style>${style}</style>
</head>
<body>
<sg-root></sg-root>
<script type="application/json" id="sigil-data">"__SIGIL_DATA__"</script>
<script type="application/json" id="sigil-assets">"__SIGIL_ASSETS__"</script>
<script type="module">${script}</script>
</body>
</html>
`;
await mkdir('public/export', { recursive: true });
await writeFile('public/export/viewer.html', html);
console.log(`public/export/viewer.html  ${(html.length / 1024).toFixed(0)} kB`);
