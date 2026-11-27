// Enforces the project's file rule: one class, function, type or constant per file,
// and nothing else declared at the top level beside it. Run with `npm run check:structure`.
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import ts from 'typescript';

const walk = async (dir) => (await Promise.all((await readdir(dir, { withFileTypes: true })).map((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)])))).flat();
const files = (await walk('src/app')).filter((f) => f.endsWith('.ts') && !f.endsWith('.spec.ts'));
const problems = [];
for (const file of files) {
  const source = ts.createSourceFile(file, await readFile(file, 'utf8'), ts.ScriptTarget.Latest, true);
  const declared = source.statements.filter((s) => !ts.isImportDeclaration(s));
  if (declared.length !== 1) problems.push(`${file}: ${declared.length} top-level declarations`);
  else if (!declared[0].modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) problems.push(`${file}: the declaration is not exported`);
}
console.log(`${files.length} files checked`);
if (problems.length) { console.error(problems.join('\n')); process.exit(1); }
