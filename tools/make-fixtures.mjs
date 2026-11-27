// Regenerates the parity fixtures from the framework-free Sigil engine (the reference implementation).
// Usage: node tools/make-fixtures.mjs /path/to/sigil-cv
import { readFile, writeFile, readdir, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ref = path.resolve(process.argv[2] ?? '../orbit-cv');
const load = (file) => import(pathToFileURL(path.join(ref, 'src', file)).href);
const { normalize, assignInks } = await load('core/normalize.js');
const { adapt } = await load('core/adapt.js');
const { setLang, localize, languagesOf } = await load('core/i18n.js');

const round = (n) => Math.round(n * 100) / 100;
const project = (m) => ({
  meta: m.meta, profile: m.profile, contact: m.contact,
  experience: m.experience.map((e) => ({ id: e.id, role: e.role, company: e.company, location: e.location, start: e.start, end: e.end, current: e.current, summary: e.summary, stats: e.stats, highlights: e.highlights, roles: e.roles, roleIds: e.roleIds, tags: e.tags, team: e.team, employer: e.employer, roleSince: e.roleSince, sub: e.sub, organisations: e.moons.map((x) => ({ name: x.name, missionCount: x.bases })) })),
  positions: m.planets.map((p) => ({ kind: p.kind === 'role' ? 'role' : 'entry', id: p.id, name: p.name, summary: p.summary ?? '', parts: p.parts ?? [], start: p.start, end: p.end, current: p.current, years: round(p.years), engagements: p.kind === 'role' ? p.moons.map((x) => ({ name: x.name, via: x.via, title: x.title, experience: x.exp.id, start: x.start, end: x.end, current: x.current, missions: x.missions, missionParts: x.missionParts, parts: x.parts })) : [] })),
  milestones: m.milestones, achievements: m.achievements, projects: m.projects, skills: m.skills, education: m.education, certifications: m.certifications, awards: m.awards, interests: m.interests,
  careerYears: m.careerYears, archetype: m.archetype, theme: m.theme,
  sections: m.sections.map((s) => ({ id: s.id, type: s.type, sourceType: s.sourceType, title: s.title, nav: s.nav, intro: s.intro, text: s.text, accent: s.accent, ground: s.ground, modes: s.modes, blocks: s.blocks.length })),
  chapters: assignInks(m.sections.filter((s) => s.modes.includes('immersive')), m.theme).map((s) => ({ id: s.id, accent: s.accent, ground: s.ground })),
});

const files = [path.join(ref, 'content/cv.json'), ...(await readdir(path.join(ref, 'content/examples'))).filter((f) => f.endsWith('.json')).map((f) => path.join(ref, 'content/examples', f))];
const cases = [];
for (const file of files) {
  const input = JSON.parse(await readFile(file, 'utf8'));
  const adapted = adapt(input);
  for (const lang of languagesOf(adapted.data).all) {
    setLang(lang);
    cases.push({ name: `${path.basename(file)} [${lang}]`, lang, input, format: adapted.format, found: adapted.found, expected: project(normalize(localize(adapted.data, lang))) });
  }
}
await mkdir('src/testing', { recursive: true });
await writeFile('src/testing/parity-fixtures.json', JSON.stringify({ now: new Date().toISOString(), cases }));
console.log(cases.length, 'cases');
