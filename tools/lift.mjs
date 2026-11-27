// Lifts a module of the framework-free reference engine into one TypeScript class.
// The reference's top-level functions become methods and its top-level constants become
// fields, so the result is one class per file. Bodies are carried over unchanged; values
// are typed `any` inside, and the class is given a typed public surface by hand afterwards
// where it matters. Usage: node tools/lift.mjs <config.json>
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import ts from 'typescript';

const cfg = JSON.parse(await readFile(process.argv[2], 'utf8'));
for (const job of cfg.jobs) {
  const file = path.resolve(cfg.reference, job.src);
  let text = await readFile(file, 'utf8');
  for (const [from, to] of job.patch ?? []) {
    if (!text.includes(from)) throw new Error(`${job.out}: patch source not found: ${from}`);
    text = text.split(from).join(to);
  }
  const host = ts.createCompilerHost({ allowJs: true });
  const read = host.readFile.bind(host);
  host.readFile = (name) => (path.resolve(name) === file ? text : read(name));
  const program = ts.createProgram([file], { allowJs: true, noEmit: true, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, noResolve: true }, host);
  const checker = program.getTypeChecker();
  const sf = program.getSourceFile(file);

  // Top-level declarations by name.
  const decl = new Map();
  const imported = new Map();
  for (const st of sf.statements) {
    if (ts.isFunctionDeclaration(st) && st.name) decl.set(st.name.text, st);
    else if (ts.isVariableStatement(st)) for (const d of st.declarationList.declarations) if (ts.isIdentifier(d.name)) decl.set(d.name.text, st);
    else if (ts.isImportDeclaration(st) && st.importClause?.namedBindings && ts.isNamedImports(st.importClause.namedBindings)) for (const el of st.importClause.namedBindings.elements) imported.set(el.name.text, st);
  }
  const topOf = (node) => { let n = node; while (n.parent && n.parent !== sf) n = n.parent; return n; };
  const refTarget = (id) => {
    const sym = ts.isShorthandPropertyAssignment(id.parent) ? checker.getShorthandAssignmentValueSymbol(id.parent) : checker.getSymbolAtLocation(id);
    const d = sym?.declarations?.[0];
    if (!d) return null;
    if (ts.isImportSpecifier(d)) return { kind: 'import', name: id.text };
    const top = topOf(d);
    if (d.getSourceFile() !== sf) return null;
    if ((ts.isFunctionDeclaration(d) && d.parent === sf) || (ts.isVariableDeclaration(d) && d.parent.parent.parent === sf)) return { kind: 'local', name: id.text, top };
    return null;
  };

  // Which declarations to keep: everything reachable from the entry points.
  const deps = new Map();
  const visitRefs = (node, owner) => {
    if (ts.isIdentifier(node)) { const r = refTarget(node); if (r?.kind === 'local' && r.name !== owner) deps.get(owner).add(r.name); }
    ts.forEachChild(node, (c) => visitRefs(c, owner));
  };
  for (const [name, st] of decl) { deps.set(name, new Set()); visitRefs(ts.isVariableStatement(st) ? st.declarationList.declarations.find((d) => d.name.text === name) : st, name); }
  const keep = new Set();
  const want = (name) => { if (keep.has(name) || !decl.has(name)) return; keep.add(name); for (const d of deps.get(name)) want(d); };
  for (const entry of job.entries ?? [...decl.keys()]) want(entry);

  const edits = [];
  const needSelf = new Set();
  const walk = (node, top) => {
    if (ts.isParameter(node) && !node.type) {
      const at = node.questionToken ? node.questionToken.end : node.name.end;
      edits.push({ pos: at, end: at, text: node.dotDotDotToken ? ': any[]' : ': any' });
    }
    if (ts.isVariableDeclaration(node) && !node.type && !(ts.isVariableDeclarationList(node.parent) && (ts.isForOfStatement(node.parent.parent) || ts.isForInStatement(node.parent.parent))) && !ts.isCatchClause(node.parent) && node.parent.parent.parent !== sf) {
      edits.push({ pos: node.name.end, end: node.name.end, text: ': any' });
    }
    if (ts.isForOfStatement(node)) { edits.push({ pos: node.expression.getStart(sf), end: node.expression.getStart(sf), text: '(' }); edits.push({ pos: node.expression.end, end: node.expression.end, text: ' as any)' }); }
    if (ts.isCatchClause(node) && node.variableDeclaration && !node.variableDeclaration.type) edits.push({ pos: node.variableDeclaration.name.end, end: node.variableDeclaration.name.end, text: ': any' });
    if (ts.isIdentifier(node)) {
      const p = node.parent;
      const isDeclName = (ts.isFunctionDeclaration(p) || ts.isVariableDeclaration(p) || ts.isParameter(p) || ts.isBindingElement(p) || ts.isImportSpecifier(p)) && p.name === node;
      const isProp = (ts.isPropertyAccessExpression(p) && p.name === node) || (ts.isPropertyAssignment(p) && p.name === node) || (ts.isMethodDeclaration(p) && p.name === node) || (ts.isBindingElement(p) && p.propertyName === node);
      if (!isDeclName && !isProp) {
        const r = refTarget(node);
        let repl = null;
        // Inside a nested function or an object's method, `this` is no longer the class: go through `self`.
        let inner = false;
        for (let n = node.parent; n && n !== top; n = n.parent) if (ts.isFunctionDeclaration(n) || ts.isFunctionExpression(n) || ts.isMethodDeclaration(n) || ts.isGetAccessor(n) || ts.isSetAccessor(n)) inner = true;
        if (r?.kind === 'import') {
          repl = (job.imports ?? {})[r.name];
          if (repl === undefined) throw new Error(`${job.out}: no mapping for import "${r.name}"`);
          if (inner && repl.includes('this.')) { repl = repl.replaceAll('this.', 'self.').replaceAll('(this)', '(self)'); needSelf.add(top); }
        } else if (r?.kind === 'local') {
          if (inner) needSelf.add(top);
          repl = `${inner ? 'self' : 'this'}.${(job.rename ?? {})[r.name] ?? r.name}`;
        }
        if (repl !== null && repl !== node.text) edits.push({ pos: node.getStart(sf), end: node.end, text: ts.isShorthandPropertyAssignment(p) ? `${node.text}: ${repl}` : repl });
      }
    }
    ts.forEachChild(node, (c) => walk(c, top));
  };

  const members = [];
  const exported = (st) => st.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
  const apply = (from, to, list) => { let out = text.slice(from, to); for (const e of list.filter((e) => e.pos >= from && e.end <= to).sort((a, b) => b.pos - a.pos || (b.end - b.pos) - (a.end - a.pos))) out = out.slice(0, e.pos - from) + e.text + out.slice(e.end - from); return out; };
  for (const st of sf.statements) {
    if (ts.isImportDeclaration(st)) continue;
    const names = ts.isFunctionDeclaration(st) ? [st.name.text] : ts.isVariableStatement(st) ? st.declarationList.declarations.map((d) => d.name.text) : null;
    if (!names) { if (!job.dropLoose) throw new Error(`${job.out}: unsupported top-level statement: ${st.getText(sf).slice(0, 80)}`); continue; }
    if (!names.some((n) => keep.has(n))) continue;
    edits.length = 0;
    walk(st, st);
    const doc = text.slice(st.getFullStart(), st.getStart(sf)).trim();
    const vis = (n) => (exported(st) || (job.public ?? []).includes(n) ? '' : 'private ');
    if (ts.isFunctionDeclaration(st)) {
      const name = (job.rename ?? {})[names[0]] ?? names[0];
      const mods = st.modifiers?.some((m) => m.kind === ts.SyntaxKind.AsyncKeyword) ? 'async ' : '';
      const star = st.asteriskToken ? '*' : '';
      const params = apply(st.parameters.pos, st.parameters.end, edits);
      let body = apply(st.body.getStart(sf), st.body.end, edits);
      if (needSelf.has(st)) body = '{\n  const self = this;' + body.slice(1);
      members.push(`${doc ? doc + '\n' : ''}${vis(names[0])}${mods}${star}${name}(${params}): ${mods ? 'Promise<any>' : 'any'} ${body}`);
    } else {
      for (const d of st.declarationList.declarations) {
        if (!keep.has(d.name.text)) continue;
        const name = (job.rename ?? {})[d.name.text] ?? d.name.text;
        let init = d.initializer ? apply(d.initializer.getStart(sf), d.initializer.end, edits) : 'undefined';
        if (needSelf.has(st)) init = `(() => { const self = this; return ${init}; })()`;
        members.push(`${doc ? doc + '\n' : ''}${vis(d.name.text)}${name}: any = ${init};`);
      }
    }
  }
  const indent = (s) => s.split('\n').map((l) => (l ? '  ' + l : l)).join('\n');
  const out = `${(job.header ?? []).join('\n')}\nexport class ${job.class} {\n${(job.prelude ?? []).map((l) => '  ' + l).join('\n')}${job.prelude?.length ? '\n\n' : ''}${members.map(indent).join('\n\n')}\n}\n`;
  const target = path.resolve(cfg.out, job.out);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, out);
  console.log(job.out, members.length, 'members');
}
