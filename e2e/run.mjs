// End-to-end checks for the Angular edition, ported from the reference engine's suite:
// rendering, JSON replacement, keyboard, reduced motion, automated accessibility
// (axe-core, WCAG 2.2 A/AA rules), the Studio and every export.
// Build first (`npm run build && npm run build:public`), then `npm run e2e`.
// Writes E2E-RESULTS.md.
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir, rm, readdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const axeSource = await readFile(require.resolve('axe-core/axe.min.js'), 'utf8');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist/sigil-angular/browser');
const publicDist = path.join(root, 'dist/public/browser');
const outDir = path.join(root, 'dist/e2e-exports');
await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });

// One static server per CV: the same build, a different cv.json, no code change.
// Unknown paths answer with index.html, as a single-page application needs.
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
const servers = new Map();
async function baseFor(example = '') {
  if (servers.has(example)) return servers.get(example).base;
  const server = createServer(async (req, res) => {
    const name = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const candidates = name === '/cv.json' && example ? [path.join(root, 'e2e/examples', `${example}.json`)] : [path.join(dist, name), path.join(dist, 'index.html')];
    for (const file of candidates) {
      try {
        const data = await readFile(file);
        res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
        res.end(data);
        return;
      } catch { /* try the next candidate */ }
    }
    res.writeHead(404); res.end('Not found');
  });
  await new Promise((r) => server.listen(0, r));
  const base = `http://localhost:${server.address().port}`;
  servers.set(example, { server, base });
  return base;
}

const results = [];
const notes = [];
const check = (group, name, pass, detail = '') => { results.push({ group, name, state: pass ? 'pass' : 'fail', detail }); console.log(`${pass ? 'PASS' : 'FAIL'}  ${group}: ${name}${detail ? '  (' + detail + ')' : ''}`); };
const notPorted = (group, name, detail) => { results.push({ group, name, state: 'missing', detail }); console.log(`MISSING  ${group}: ${name}  (${detail})`); };
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });

async function open(url, opts = {}) {
  const { cv = '', ...context } = opts;
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true, ...context });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/favicon|fonts\.g|Failed to load resource/.test(m.text())) errors.push(m.text()); });
  await page.goto((await baseFor(cv)) + url);
  await page.waitForSelector('.scv, .st-bar', { timeout: 10000 });
  // Let the opening titles and the entrance finish before anything is measured.
  await page.waitForFunction(() => !document.querySelector('.intro'), null, { timeout: 8000 });
  await page.waitForTimeout(1300);
  return { ctx, page, errors };
}
async function axe(page, label, group = 'Accessibility (axe-core)') {
  await page.evaluate(axeSource);
  const r = await page.evaluate(async () => {
    const out = await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] }, resultTypes: ['violations', 'incomplete'] });
    return { violations: out.violations.map((v) => ({ id: v.id, impact: v.impact, n: v.nodes.length, sample: v.nodes[0]?.target?.join(' '), summary: v.nodes[0]?.failureSummary?.split('\n')[1] })), incomplete: out.incomplete.map((v) => `${v.id} x${v.nodes.length}`) };
  });
  check(group, label, r.violations.length === 0, r.violations.map((v) => `${v.id}[${v.impact}] x${v.n} ${v.sample} ${v.summary || ''}`).join('; '));
  return r;
}
const section = async (name, run) => { try { await run(); } catch (e) { check('Suite', `${name} ran to the end`, false, String(e.message || e).split('\n')[0].slice(0, 220)); } };

// ---------------------------------------------------------------- 1. Immersive, desktop and phone
const incomplete = new Set();
for (const [label, viewport] of [['desktop 1440', { width: 1440, height: 900 }], ['phone 390', { width: 390, height: 844 }]]) {
  await section(`rendering, ${label}`, async () => {
    const { ctx, page, errors } = await open('/', { viewport });
    check('Rendering', `loads from external cv.json, ${label}`, (await page.textContent('h1')).includes('Amara'));
    check('Rendering', `no script errors, ${label}`, errors.length === 0, errors.join(' | '));
    check('Rendering', `WebGL dither layer active, ${label}`, await page.evaluate(() => !document.querySelector('.scv').classList.contains('no-gl') && document.querySelectorAll('canvas.dither').length > 0));
    const ids = await page.evaluate(() => [...document.querySelectorAll('.ch')].map((s) => s.id));
    check('Rendering', `all demo chapters present, ${label}`, ids.length === 13, ids.join(','));
    let overflow = 0; const grounds = new Set();
    for (const id of ids) {
      await page.evaluate((id) => document.getElementById(id).scrollIntoView({ block: 'start' }), id);
      await page.waitForTimeout(1000);
      overflow = Math.max(overflow, await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth));
      grounds.add(await page.evaluate(() => getComputedStyle(document.querySelector('.scv')).getPropertyValue('--ground').trim()));
      const r = await axe(page, `chapter "${id}", ${label}`);
      r.incomplete.forEach((x) => incomplete.add(x.split(' ')[0]));
    }
    check('Rendering', `no horizontal overflow, ${label}`, overflow <= 0, `${overflow}px`);
    check('Rendering', `ground re-inks between chapters, ${label}`, grounds.size >= 3, [...grounds].join(' '));
    check('Rendering', `no broken images, ${label}`, await page.evaluate(() => [...document.querySelectorAll('.scv img')].every((i) => !i.complete || i.naturalWidth > 0)));
    check('Navigation', `active section indicator follows scroll, ${label}`, await page.evaluate(() => { const el = document.querySelector('.nav__link[aria-current="true"] [data-scramble-text]'); return (el?.dataset.text || el?.textContent) === 'Contact'; }));
    if (viewport.width < 800) {
      await page.click('.nav__menu'); await page.waitForTimeout(150);
      check('Navigation', 'phone menu opens and lists sections', await page.isVisible('.nav__links a'));
      await page.click('.nav__links a[href="#skills"]');
      await page.waitForTimeout(1800);
      check('Navigation', 'phone menu link jumps to its section', await page.evaluate(() => Math.abs(document.getElementById('skills').getBoundingClientRect().top) < 140));
    }
    await page.click('button[data-mode="recruiter"]');
    await page.waitForTimeout(500);
    check('Recruiter mode', `toggle shows the recruiter document, ${label}`, await page.isVisible('.rec h1') && !(await page.isVisible('.scv__main')));
    check('Recruiter mode', `same content source, ${label}`, (await page.textContent('.rec')).includes('Halden Mobility'));
    await axe(page, `recruiter mode, ${label}`);
    await page.click('button[data-mode="immersive"]');
    await page.waitForTimeout(400);
    check('Recruiter mode', `toggle returns to immersive, ${label}`, await page.isVisible('.scv__main'));
    await ctx.close();
  });
}

// ---------------------------------------------------------------- 2. Keyboard, motion control, hidden interactions
await section('keyboard', async () => {
  const { ctx, page } = await open('/');
  await page.keyboard.press('Tab');
  check('Keyboard', 'first Tab stop is the skip link', await page.evaluate(() => document.activeElement.classList.contains('skip')));
  await page.keyboard.press('Enter');
  await page.waitForTimeout(150);
  check('Keyboard', 'skip link moves focus into the content', await page.evaluate(() => document.activeElement.id === 'sigil-main' || !!document.activeElement.closest('#sigil-main')));
  await page.focus('.nav__menu');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(150);
  check('Keyboard', 'the index opens from the keyboard', await page.evaluate(() => document.querySelector('.nav__menu').getAttribute('aria-expanded') === 'true') && await page.isVisible('.nav__link[href="#experience"]'));
  await page.focus('.nav__link[href="#experience"]');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1200);
  check('Keyboard', 'index link moves focus to the chapter heading and closes the index', await page.evaluate(() => document.activeElement.id === 'experience-title' && document.querySelector('.nav__menu').getAttribute('aria-expanded') === 'false'), await page.evaluate(() => `${document.activeElement.tagName}#${document.activeElement.id}`));
  await page.setViewportSize({ width: 820, height: 900 }); await page.waitForTimeout(500);
  await page.focus('#experience .track');
  for (let i = 0; i < 6; i++) await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(500);
  check('Keyboard', 'the journey strip scrolls with the arrow keys', await page.evaluate(() => document.querySelector('#experience .track').scrollLeft > 0));
  await page.setViewportSize({ width: 1440, height: 900 }); await page.waitForTimeout(500);
  await page.focus('#experience .badge');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1300);
  check('Keyboard', 'a role badge in the journey opens that role\'s deep dive and moves focus to it', await page.evaluate(() => document.activeElement.classList.contains('rolerow__btn') && document.activeElement.getAttribute('aria-expanded') === 'true'));
  await page.focus('#roles-row-1');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(150);
  check('Keyboard', 'role rows expand and collapse from the keyboard', await page.evaluate(() => document.getElementById('roles-row-1').getAttribute('aria-expanded') === 'true' && !document.getElementById('roles-panel-1').hidden && document.getElementById('roles-panel-0').hidden));
  await page.evaluate(() => document.getElementById('skills').scrollIntoView()); await page.waitForTimeout(900);
  await page.click('#skills .viewbar .seg__btn:nth-child(2)');
  await page.waitForTimeout(900);
  check('Keyboard', 'the skill pile has a plain list alternative', await page.evaluate(() => document.querySelector('#skills .pile').hidden && !document.querySelector('#skills .skilllist').hidden && document.querySelectorAll('#skills .meter').length > 0));
  check('Motion control', 'a pause control is offered while anything moves on its own', await page.isVisible('.motionbtn'));
  await page.focus('.motionbtn');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(400);
  const t1 = await page.evaluate(() => document.querySelector('.hero__marquee .marquee__track').style.transform);
  await page.waitForTimeout(500);
  check('Motion control', 'pausing holds the running strips and the dither layer', await page.evaluate((t1) => document.querySelector('.scv').dataset.motion === 'paused' && document.querySelector('.motionbtn').getAttribute('aria-pressed') === 'true' && document.querySelector('.hero__marquee .marquee__track').style.transform === t1, t1));
  await page.keyboard.press('Enter');
  await page.waitForTimeout(400);
  check('Motion control', 'playing resumes them', await page.evaluate((t1) => document.querySelector('.scv').dataset.motion === 'running' && document.querySelector('.hero__marquee .marquee__track').style.transform !== t1, t1));
  await page.click('#skills .viewbar .seg__btn:nth-child(1)'); await page.waitForTimeout(600);
  await page.keyboard.type('moon'); await page.waitForTimeout(2200);
  const moon1 = await page.evaluate(() => { const f = document.querySelector('.launch'); return { film: !!f, dialog: f?.getAttribute('role') === 'dialog' && !!f.getAttribute('aria-label'), canvas: (f?.querySelector('canvas')?.width || 0) > 50, skip: document.activeElement?.classList.contains('launch__skip'), shot: f?.dataset.shot, away: [...document.querySelectorAll('#skills .brick')].filter((e) => e.style.visibility === 'hidden').length, said: [...document.querySelectorAll('[role="status"]')].some((s) => /left for the moon/.test(s.textContent)) }; });
  check('Hidden interactions', 'a skill sent to the moon plays a full-screen WebGL sequence, announced and skippable', moon1.film && moon1.dialog && moon1.canvas && moon1.skip && moon1.shot === '0' && moon1.away === 1 && moon1.said, JSON.stringify(moon1));
  await page.waitForTimeout(4200);
  check('Hidden interactions', 'the sequence moves through ascent, descent and impact to the landing', await page.evaluate(() => +document.querySelector('.launch')?.dataset.shot >= 2 && /T\+0[5-9]/.test(document.querySelector('.launch').textContent)));
  await page.keyboard.press('Escape'); await page.waitForTimeout(2600);
  const moon2 = await page.evaluate(() => ({ film: !!document.querySelector('.launch'), away: [...document.querySelectorAll('#skills .brick')].filter((e) => e.style.visibility === 'hidden').length }));
  check('Hidden interactions', 'Escape ends it, and the skill drops back into the pile', !moon2.film && moon2.away === 0, JSON.stringify(moon2));
  await page.keyboard.type('sudo'); await page.waitForTimeout(300);
  check('Hidden interactions', 'typed words answer with a short message that is also announced', await page.evaluate(() => { const e = document.querySelector('.egg'); return !!e && !e.hidden && /Permission denied/.test(e.textContent) && [...document.querySelectorAll('[role="status"]')].some((s) => /Permission denied/.test(s.textContent)); }));
  for (const k of ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a']) await page.keyboard.press(k);
  await page.waitForTimeout(1200);
  check('Hidden interactions', 'the Konami code switches gravity off in the pile for a while', await page.evaluate(() => /zero gravity/i.test(document.querySelector('.egg')?.textContent ?? '')));
  await page.waitForTimeout(7200);
  await page.focus('#projects .textbtn');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(150);
  check('Keyboard', 'project case opens as a modal dialog', await page.evaluate(() => !!document.querySelector('dialog.case[open]')));
  // The chapter's colours fade in as the dialog opens; contrast is measured once they have settled.
  await page.waitForTimeout(700);
  await axe(page, 'open project dialog');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(150);
  check('Keyboard', 'Escape closes the dialog and returns focus', await page.evaluate(() => !document.querySelector('dialog.case[open]') && document.activeElement.classList.contains('textbtn')));
  await page.focus('button[data-mode="recruiter"]');
  await page.keyboard.press('Space');
  await page.waitForTimeout(300);
  check('Keyboard', 'mode toggle works from the keyboard', await page.evaluate(() => document.querySelector('.scv').dataset.mode === 'recruiter'));
  await page.focus('.rec .dl > button');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(150);
  check('Keyboard', 'download menu opens and focuses its first item', await page.evaluate(() => document.activeElement.classList.contains('menu__item')));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(150);
  check('Keyboard', 'Escape closes the download menu', await page.evaluate(() => document.querySelector('.rec .menu').hidden));
  await page.evaluate(() => document.querySelector('button[data-mode="immersive"]').focus());
  await page.keyboard.press('Tab'); await page.keyboard.press('Shift+Tab');
  check('Keyboard', 'focus indicator is visible', await page.evaluate(() => { const s = getComputedStyle(document.activeElement); return s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) >= 2; }));
  await ctx.close();
});

// ---------------------------------------------------------------- 3. Reduced motion
await section('reduced motion', async () => {
  const { ctx, page } = await open('/', { reducedMotion: 'reduce' });
  check('Reduced motion', 'no reveal or entrance animation classes', await page.evaluate(() => !document.querySelector('.has-motion') && !document.querySelector('.is-animated')));
  check('Reduced motion', 'all content visible at rest', await page.evaluate(() => [...document.querySelectorAll('[data-reveal]')].every((el) => getComputedStyle(el).opacity === '1')));
  check('Reduced motion', 'no opening titles, custom pointer, pile physics or pause control (nothing moves)', await page.evaluate(() => !document.querySelector('.intro') && !document.querySelector('.cursor') && !document.querySelector('.pile.is-live') && !document.querySelector('.motionbtn') && !document.querySelector('#skills .skilllist').hidden));
  check('Reduced motion', 'hidden interactions are not installed', await page.evaluate(() => !document.querySelector('.egg')));
  check('Reduced motion', 'no running CSS animations', await page.evaluate(() => document.getAnimations().length === 0), await page.evaluate(() => document.getAnimations().slice(0, 3).map((a) => `${a.animationName || a.transitionProperty}@${a.effect?.target?.className}`).join(', ')));
  await ctx.close();
});

// ---------------------------------------------------------------- 3b. Reflow at 320 px and text spacing (WCAG 1.4.10, 1.4.12)
await section('reflow', async () => {
  const { ctx, page } = await open('/', { viewport: { width: 320, height: 640 } });
  let overflow = 0;
  const ids = await page.evaluate(() => [...document.querySelectorAll('.ch')].map((s) => s.id));
  for (const id of ids) { await page.evaluate((id) => document.getElementById(id).scrollIntoView(), id); await page.waitForTimeout(250); overflow = Math.max(overflow, await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)); }
  check('Reflow', 'immersive mode reflows at 320 px with no horizontal scroll', overflow <= 0, `${overflow}px`);
  await page.click('button[data-mode="recruiter"]'); await page.waitForTimeout(300);
  check('Reflow', 'recruiter mode reflows at 320 px with no horizontal scroll', await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth) <= 0);
  await page.click('button[data-mode="immersive"]'); await page.waitForTimeout(300);
  await page.addStyleTag({ content: '* { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; } p { margin-bottom: 2em !important; }' });
  await page.waitForTimeout(300);
  const clipped = await page.evaluate(() => [...document.querySelectorAll('.scv__main p, .scv__main h1, .scv__main h2, .scv__main h3, .scv__main li, .scv__main a, .scv__main button')].filter((el) => { const st = getComputedStyle(el); return (st.overflow === 'hidden' || st.overflowX === 'hidden') && el.scrollWidth > el.clientWidth + 1; }).length);
  check('Reflow', 'increased text spacing clips no text', clipped === 0 && await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth) <= 0, `${clipped} clipped`);
  await ctx.close();
});

// ---------------------------------------------------------------- 4. Replace the JSON, change nothing else
for (const [name, expectName] of [['minimal', 'Sam Rivera'], ['consultant', 'Jonas Abara']]) {
  await section(`${name}.json`, async () => {
    const { ctx, page, errors } = await open('/', { cv: name });
    check('JSON replacement', `${name}.json renders without code changes`, (await page.getAttribute('h1', 'aria-label')) === expectName && errors.length === 0, errors.join(' | '));
    await axe(page, `${name}.json opening`, 'JSON replacement');
    if (name === 'minimal') {
      check('Optional content', 'missing sections are omitted, not shown empty', await page.evaluate(() => !document.getElementById('projects') && !document.getElementById('awards') && !!document.getElementById('experience')));
      check('Optional content', 'no portrait: the signature mark and a generated pattern stand in', await page.evaluate(() => !document.querySelector('.hero img') && !!document.querySelector('.hero__art.pic--gen') && !!document.querySelector('.nav__sigil path')));
    } else {
      check('Custom sections', 'custom section renders from blocks', await page.evaluate(() => !!document.getElementById('approach')));
      check('Custom sections', 'unknown block type falls back to its text', await page.evaluate(() => !!document.querySelector('.block--unknown')?.textContent.includes('fall back')));
      check('Custom sections', 'video block without a source is skipped', await page.evaluate(() => !document.querySelector('#approach video')));
      check('Content adaptation', 'archetype detected as consultant, order follows the JSON', await page.evaluate(() => window.sigil.model.archetype === 'consultant' && [...document.querySelectorAll('.ch')].map((s) => s.id).join(',') === 'top,achievements,experience,summary,approach,skills,contact'), await page.evaluate(() => [...document.querySelectorAll('.ch')].map((s) => s.id).join(',')));
      check('Theme configuration', 'dark mode and horizon lead ink applied from JSON', await page.evaluate(() => getComputedStyle(document.querySelector('.scv')).getPropertyValue('--accent').replace(/\s/g, '') === 'rgb(255,122,217)'));
    }
    await ctx.close();
  });
}
await section('missing assets', async () => {
  const { ctx, page, errors } = await open('/', { cv: 'missing-assets' });
  await page.evaluate(() => document.getElementById('extras').scrollIntoView());
  await page.waitForTimeout(1200);
  const r = await page.evaluate(() => ({ broken: [...document.querySelectorAll('.scv img')].filter((i) => i.complete && i.naturalWidth === 0).length, generated: document.querySelectorAll('.pic--gen').length, unsafe: document.querySelectorAll('img[src^="javascript"]').length }));
  check('Optional content', 'missing or unsafe images are replaced by generated visuals', r.broken === 0 && r.unsafe === 0 && r.generated >= 6 && errors.length === 0, JSON.stringify(r) + errors.join(';'));
  await ctx.close();
});

// ---------------------------------------------------------------- 4d. The print PDF asks about the accessible edition
await section('print PDF question', async () => {
  const { ctx, page, errors } = await open('/');
  await page.click('button[data-mode="recruiter"]'); await page.waitForTimeout(500);
  await page.click('.rec .dl > button'); await page.click('.rec .menu >> text=Print-ready PDF'); await page.waitForTimeout(300);
  check('Print PDF', 'choosing the print-ready PDF opens a question about adding the accessible version', await page.evaluate(() => { const d = document.querySelector('.rec dialog.ask'); return d.open && d.contains(document.activeElement) && !!d.getAttribute('aria-labelledby'); }));
  await axe(page, 'print PDF question dialog', 'Print PDF');
  await page.keyboard.press('Escape'); await page.waitForTimeout(200);
  check('Print PDF', 'Escape closes the question without downloading', await page.evaluate(() => !document.querySelector('.rec dialog.ask').open));
  await page.click('.rec .dl > button'); await page.click('.rec .menu >> text=Print-ready PDF');
  const [one] = await Promise.all([page.waitForEvent('download'), page.click('.rec .ask >> text=Print-ready only')]);
  await page.click('.rec .dl > button'); await page.click('.rec .menu >> text=Print-ready PDF');
  const [two] = await Promise.all([page.waitForEvent('download'), page.click('.rec .ask >> text=Both in one PDF')]);
  check('Print PDF', 'both answers produce a file, named for what it contains', /-cv-print\.pdf$/.test(one.suggestedFilename()) && /-cv-print-accessible\.pdf$/.test(two.suggestedFilename()) && errors.length === 0, `${one.suggestedFilename()} ${two.suggestedFilename()} ${errors.join(';')}`);
  await ctx.close();
});

// ---------------------------------------------------------------- 4c. Any CV JSON, and the signature
await section('any JSON', async () => {
  const a = await open('/', { cv: 'jsonresume' });
  const r = await a.page.evaluate(() => { const o = window.sigil, m = o.model; return { fmt: o.imported.format, name: m.profile.name, headline: m.profile.headline, loc: m.profile.location, jobs: m.experience.map((e) => `${e.role}@${e.company}:${e.start}:${e.current ? 'now' : e.end}`).join('|'), edu: m.education.map((e) => `${e.degree}@${e.school}`).join('|'), skills: m.skills.technical.map((s) => `${s.group}/${s.name}`).join(','), langs: m.skills.languages.length, projects: m.projects.length, certs: m.certifications[0]?.year, quote: m.profile.quote?.cite, links: m.contact.links.length, ids: [...document.querySelectorAll('.ch')].map((e) => e.id).join(','), h1: document.querySelector('.hero__name').getAttribute('aria-label') }; });
  check('Any JSON', 'a JSON Resume file loads as it is, with no editing', r.fmt === 'jsonresume' && r.name === 'Noor Example' && r.h1 === 'Noor Example' && r.headline === 'Data Engineer' && r.loc === 'Lyon, FR' && a.errors.length === 0, JSON.stringify(r) + a.errors.join(';'));
  check('Any JSON', 'JSON Resume work, education, skills, projects and references are mapped', r.jobs === 'Senior Data Engineer@Example Data Co:2021-03:now|Data Engineer@Sample Analytics:2017-09:2021-02' && r.edu === 'MSc, Computer Science@Example University' && r.skills.startsWith('Languages/Python,Languages/SQL') && r.langs === 2 && r.projects === 1 && r.certs === '2023' && r.quote === 'A fictional manager' && r.links === 1, JSON.stringify(r));
  check('Any JSON', 'the converted CV renders its chapters', ['experience', 'projects', 'skills', 'education', 'contact'].every((id) => r.ids.split(',').includes(id)), r.ids);
  await axe(a.page, 'JSON Resume file, opening', 'Any JSON');
  await a.ctx.close();

  const b = await open('/', { cv: 'loose' });
  const q = await b.page.evaluate(() => { const o = window.sigil, m = o.model; return { fmt: o.imported.format, name: m.profile.name, headline: m.profile.headline, loc: m.profile.location, email: m.contact.email, link: m.contact.links[0]?.url, jobs: m.experience.map((e) => `${e.role}@${e.company}:${e.start}:${e.current ? 'now' : e.end}:${e.highlights.length}`).join('|'), tags: m.experience[0].tags.join('+'), edu: m.education.map((e) => `${e.degree}@${e.school}:${e.end}`).join('|'), skills: m.skills.technical.map((s) => `${s.group}/${s.name}`).join(','), soft: m.skills.soft.join(','), langs: m.skills.languages.map((l) => `${l.name}:${l.level}`).join(','), interests: m.interests.join(',') }; });
  check('Any JSON', 'a CV with improvised key names is understood by meaning', q.fmt === 'generic' && q.name === 'Kim Sample' && q.headline === 'Product Designer' && q.loc === 'Montréal, Canada' && q.email === 'kim@example.com' && q.link === 'https://linkedin.example.com/in/kim-sample' && b.errors.length === 0, JSON.stringify(q) + b.errors.join(';'));
  check('Any JSON', 'free-form dates, bullet text and grouped skills are parsed', q.jobs === 'Lead Designer@Example Studio:2020-01:now:2|Designer@Sample Agency:2016-06:2019-12:2' && q.tags === 'Figma+CSS' && q.edu === 'Bachelor, Interaction Design@Example School of Design:2016' && q.skills === 'Design/Prototyping,Design/Typography,Code/HTML,Code/CSS' && q.soft === 'Facilitation' && q.langs === 'French:native,English:fluent' && q.interests === 'Ceramics,Running', JSON.stringify(q));

  const sig = (p) => p.evaluate(() => ({ code: window.sigil.model.theme.code, lead: window.sigil.model.theme.lead, mark: document.querySelector('.nav__sigil path').getAttribute('d'), icon: document.querySelector('link[rel="icon"]')?.href.length > 100, shown: document.querySelector('.hero__sig').textContent }));
  const s1 = await sig(b.page);
  const c = await open('/', { cv: 'jsonresume' }); const s2 = await sig(c.page);
  const d = await open('/', { cv: 'loose' }); const s3 = await sig(d.page);
  check('Signature', 'each person gets their own mark and code', s1.code !== s2.code && s1.mark !== s2.mark && /^[0-9A-F]{4}-[0-9A-F]{4}$/.test(s1.code) && s1.shown.includes(s1.code), JSON.stringify([s1.code, s2.code]));
  check('Signature', 'the same person always gets the same signature, and it is the page icon', s1.code === s3.code && s1.mark === s3.mark && s1.lead === s3.lead && s1.icon, JSON.stringify([s1.code, s3.code, s1.icon]));
  await b.ctx.close(); await c.ctx.close(); await d.ctx.close();
});

// ---------------------------------------------------------------- 4a. Roles taken
await section('roles', async () => {
  const { ctx, page, errors } = await open('/', { cv: 'roles' });
  const r = await page.evaluate(() => { const pl = window.sigil.model.positions; const eng = (id) => pl.find((p) => p.id === id).engagements.map((m) => `${m.name}:${m.missions.length}`).join(','); return { names: pl.map((p) => p.name).join(','), kinds: [...new Set(pl.map((p) => p.kind))].join(','), backend: eng('backend'), frontend: eng('frontend'), tabs: [...document.querySelectorAll('#roles .rolerow__name')].map((e) => e.dataset.text || e.textContent).join(','), deep: document.querySelectorAll('#roles-panel-1 .deep__co').length, stops: [...document.querySelectorAll('#experience .stop')].map((e) => `${e.querySelector('.stop__title').textContent}:${[...e.querySelectorAll('.stop__co')].map((b) => b.textContent).join('+')}`).join('|'), journey: document.querySelector('#experience-title').textContent, matrix: document.querySelector('#roles .matrix__grid')?.getAttribute('aria-label') || '' }; });
  check('Roles taken', 'with "roles" in the JSON, the roles chapter lists each role with the companies it was held at', r.kinds === 'role' && r.names === 'Front-End,Back-End,Tech Lead' && r.tabs === r.names && errors.length === 0, JSON.stringify(r) + errors.join(';'));
  check('Roles taken', 'a full-stack mission counts under both the front-end and the back-end role', r.frontend === 'Example Media:2' && r.backend === 'Example Media:1,Sample Bank:2', `${r.frontend} / ${r.backend}`);
  check('Roles taken', 'a role held at several companies gets one deep-dive block per company', r.deep === 2);
  check('Roles taken', 'the journey is told by position: one stop per role, naming the companies it was held at', r.stops === 'Front-End:Example Media|Back-End:Example Media+Sample Bank|Tech Lead:Example Media' && /three positions/i.test(r.journey), `${r.stops} / ${r.journey}`);
  check('Roles taken', 'the role-by-year chart has a text alternative', r.matrix.includes('Back-End: Example Media') && r.matrix.includes('Sample Bank'), r.matrix);
  {
    const p2 = await open('/', { cv: 'parts' });
    const q = await p2.page.evaluate(() => { const pl = window.sigil.model.positions; const fs = pl.find((x) => x.id === 'fullstack'); return { names: pl.map((x) => x.name).join(','), parts: fs.parts.map((x) => `${x.name}:${x.count}`).join(','), moons: fs.engagements.map((x) => `${x.name}:${x.parts.map((y) => y.name).join('+')}`).join('|'), split: [...document.querySelectorAll('#experience .stop:first-child .split__name')].map((e) => e.textContent).join('+'), lanes: document.querySelectorAll('#roles .matrix__row--part').length, tags: document.querySelectorAll('#roles-panel-0 .tag').length, journey: document.querySelector('#experience-title').textContent }; });
    check('Roles taken', 'a position can be made of parts: front-end and back-end work roll up into one full-stack position', q.names === 'Full-Stack Engineer,Tech Lead' && q.parts === 'Front-End:2,Back-End:3' && q.moons === 'Example Media:Front-End+Back-End|Sample Bank:Back-End' && /two positions/i.test(q.journey) && p2.errors.length === 0, JSON.stringify(q));
    check('Roles taken', 'the parts are shown in the journey, the chart and the deep dive', q.split === 'Front-End+Back-End' && q.lanes === 2 && q.tags >= 3, JSON.stringify(q));
    await p2.page.evaluate(() => document.getElementById('roles').scrollIntoView()); await p2.page.waitForTimeout(1500);
    await axe(p2.page, 'roles chapter of a position with parts', 'Roles taken');
    await p2.ctx.close();
  }
  {
    const p3 = await open('/', { cv: 'employer' });
    const q = await p3.page.evaluate(() => { const m = window.sigil.model; return { subs: m.experience.map((e) => `${e.company}:${e.sub ? 'sub' : 'top'}`).join('|'), lane: [...document.querySelectorAll('#roles .matrix__row--emp .matrix__bar span')].map((e) => e.textContent).join(','), alt: document.querySelector('#roles .matrix__grid').getAttribute('aria-label'), via: [...document.querySelectorAll('#roles .deep__meta')].some((e) => /via Example Services/.test(e.textContent)) }; });
    check('Roles taken', 'client missions nest under their employer, which keeps its own responsibilities', q.subs === 'Example Services:top|Example Media:sub|Sample Bank:sub' && q.via && p3.errors.length === 0, JSON.stringify(q));
    check('Roles taken', 'the role chart gains an employer lane, described in its text alternative', q.lane === 'Example Services' && q.alt.startsWith('Employer: Example Services'), q.lane + ' / ' + q.alt.slice(0, 60));
    await p3.page.click('button[data-mode="recruiter"]'); await p3.page.waitForTimeout(500);
    check('Roles taken', 'recruiter mode shows client missions indented under the employer, each saying who it was delivered through', await p3.page.evaluate(() => document.querySelectorAll('sg-recruiter-item.sub').length === 2 && /Client mission, via Example Services/.test(document.querySelector('sg-recruiter-item.sub').textContent)));
    await axe(p3.page, 'recruiter mode with nested client missions', 'Roles taken');
    await p3.ctx.close();
  }
  await page.click('button[data-mode="recruiter"]'); await page.waitForTimeout(400);
  check('Roles taken', 'recruiter mode keeps the chronological history by company', await page.evaluate(() => [...document.querySelectorAll('#rec-experience h3')].map((e) => e.textContent).join('|') === 'Senior Full-Stack Engineer, Example Media|.NET Developer, Sample Bank'));
  await page.click('button[data-mode="immersive"]');
  await page.waitForTimeout(900);
  await page.evaluate(() => document.getElementById('experience').scrollIntoView()); await page.waitForTimeout(1600);
  await axe(page, 'journey chapter', 'Roles taken');
  await page.evaluate(() => document.getElementById('roles').scrollIntoView()); await page.waitForTimeout(1600);
  await axe(page, 'roles chapter with an open deep dive', 'Roles taken');
  await ctx.close();
});

// ---------------------------------------------------------------- 4b. English and French
await section('languages', async () => {
  const { ctx, page, errors } = await open('/');
  check('Languages', 'CV opens in its own language with an EN / FR switch', await page.evaluate(() => document.documentElement.lang === 'en' && document.querySelectorAll('.seg--lang button').length === 2));
  await page.click('.seg--lang button[lang="fr"]');
  await page.waitForTimeout(1500);
  const fr = await page.evaluate(() => ({ lang: document.documentElement.lang, rootLang: document.querySelector('.scv').lang, nav: [...document.querySelectorAll('.nav__links a')].map((a) => a.textContent).join(','), tag: document.querySelector('.hero__tag').textContent, cta: document.querySelector('.hero .pill').textContent, title: document.querySelector('#experience-title').textContent, role: document.querySelector('#experience .stop').textContent, pressed: document.querySelector('.seg--lang button[lang="fr"]').getAttribute('aria-pressed'), docTitle: document.title }));
  check('Languages', 'switching to French translates the interface', fr.lang === 'fr' && fr.rootLang === 'fr' && fr.nav.includes('Parcours') && fr.cta.includes('Commencer le récit') && fr.pressed === 'true', JSON.stringify(fr).slice(0, 200));
  check('Languages', 'French content comes from the JSON translations block', fr.tag.includes('je construis les systèmes') && fr.title.includes('Quinze ans') && fr.role.includes('Construire les systèmes') && fr.docTitle.includes('Directrice'));
  for (const id of ['top', 'experience', 'contact']) { await page.evaluate((id) => document.getElementById(id).scrollIntoView(), id); await page.waitForTimeout(1000); await axe(page, `French, chapter "${id}"`, 'Languages'); }
  check('Languages', 'no horizontal overflow in French', await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth) <= 0);
  await page.click('button[data-mode="recruiter"]');
  await page.waitForTimeout(900);
  check('Languages', 'recruiter mode in French', (await page.textContent('.rec')).includes('Expérience') && (await page.textContent('.rec')).includes('Directrice Design Engineering'));
  await axe(page, 'French, recruiter mode', 'Languages');
  await page.reload(); await page.waitForSelector('.scv'); await page.waitForTimeout(2500);
  check('Languages', 'the chosen language is remembered on return', await page.evaluate(() => document.documentElement.lang === 'fr'));
  await page.click('.seg--lang button[lang="en"]'); await page.waitForTimeout(600);
  // The page came back in the recruiter view it was left in; this edition renders one view at a time.
  await page.click('button[data-mode="immersive"]'); await page.waitForTimeout(900);
  check('Languages', 'switching back restores English', await page.evaluate(() => !!document.querySelector('.hero .pill')?.textContent.includes('Begin the story')) && errors.length === 0, errors.join(' | '));
  await ctx.close();
});
await section('language without translations', async () => {
  const { ctx, page } = await open('/', { cv: 'minimal' });
  await page.click('.seg--lang button[lang="fr"]'); await page.waitForTimeout(1200);
  check('Languages', 'CV without translations: interface in French, content unchanged', await page.evaluate(() => [...document.querySelectorAll('.nav__link [data-scramble-text]')].some((a) => (a.dataset.text || a.textContent) === 'Parcours') && document.querySelector('h1').getAttribute('aria-label') === 'Sam Rivera'));
  await ctx.close();
});

// ---------------------------------------------------------------- 5. Studio and exports
await section('studio', async () => {
  const { ctx, page, errors } = await open('/studio');
  await page.waitForTimeout(3500);
  const frame = () => page.frames().find((f) => /\/preview$/.test(new URL(f.url()).pathname));
  const inFrame = (fn, arg) => frame().evaluate(fn, arg);
  check('Studio', 'loads with the demo and a live preview', await inFrame(() => !!document.querySelector('.hero__name')) && errors.length === 0, errors.join(' | '));
  await axe(page, 'Studio, content tab', 'Studio');
  await page.fill('.st-panel:not([hidden]) input[type="text"]', 'Noor Vandermeer');
  await page.waitForTimeout(1200);
  check('Studio', 'editing a field updates the preview', await inFrame(() => document.querySelector('h1').getAttribute('aria-label')) === 'Noor Vandermeer');
  await page.click('#st-tab-sections');
  const before = await inFrame(() => [...document.querySelectorAll('.ch')].map((s) => s.id).join(','));
  await page.click('.st-sec:nth-child(3) .st-icon:nth-of-type(1)');
  await page.waitForTimeout(900);
  const after = await inFrame(() => [...document.querySelectorAll('.ch')].map((s) => s.id).join(','));
  check('Studio', 'reordering sections changes the CV', before !== after && after.startsWith('top,achievements,summary'), after);
  await axe(page, 'Studio, sections tab', 'Studio');
  await page.click('#st-tab-theme'); await page.waitForTimeout(200);
  await page.check('input[name="st-mode"][value="light"]', { force: true });
  await page.waitForTimeout(900);
  check('Studio', 'theme change applies (light ground)', await inFrame(() => getComputedStyle(document.querySelector('.scv')).getPropertyValue('--ground').replace(/\s/g, '') === 'rgb(242,241,236)'));
  await axe(page, 'Studio, theme tab', 'Studio');
  await page.fill('input[type="range"]', '0');
  await page.waitForTimeout(900);
  check('Studio', 'animation intensity 0 removes motion', await inFrame(() => !document.querySelector('.has-motion')));
  await page.click('.st-toolbar >> text=Mobile');
  await page.waitForTimeout(1200);
  check('Studio', 'phone preview uses the narrow layout', await inFrame(() => getComputedStyle(document.querySelector('.nav__menu')).display !== 'none') && await page.evaluate(() => document.querySelector('.st-frame').style.width === '390px'));
  await page.click('.st-toolbar >> text=Tablet');
  await page.waitForTimeout(600);
  check('Studio', 'tablet preview is 820 px wide', await page.evaluate(() => document.querySelector('.st-frame').style.width === '820px'));
  await page.click('.st-toolbar >> text=Recruiter'); await page.waitForTimeout(700);
  check('Studio', 'recruiter preview', await inFrame(() => !!document.querySelector('.rec h1')));
  await page.click('.st-toolbar >> text=Immersive'); await page.waitForTimeout(500);
  await page.click('#st-tab-assets');
  await page.setInputFiles('.st-panel:not([hidden]) input[type="file"]', path.join(root, 'e2e/assets/meridian.svg'));
  await page.waitForTimeout(700);
  check('Studio', 'asset upload lists the file', ((await page.textContent('.st-assets').catch(() => '')) || '').includes('assets/meridian.svg'));
  await page.click('#st-tab-json');
  await page.fill('#st-json', '{ "profile": { "name": 42 }, "experience": "nope", "contact": { "email": "bad" } }');
  await page.waitForTimeout(1000);
  check('Studio', 'validation reports errors with JSON paths', (await page.textContent('.st-status')).includes('error') && (await page.textContent('.st-issues')).includes('contact.email'), await page.textContent('.st-status'));
  await page.fill('#st-json', '{ not json');
  await page.waitForTimeout(900);
  check('Studio', 'malformed JSON is rejected without breaking the preview', (await page.textContent('#st-json-msg')).trim().startsWith('Not valid JSON') && await inFrame(() => !!document.querySelector('.scv')), await page.textContent('#st-json-msg'));
  await page.fill('#st-json', '{"profile":{"name":"<img src=x onerror=window.__xss=1>","headline":"<script>window.__xss=1</script>","tagline":"[x](javascript:window.__xss=1)"},"contact":{"links":[{"label":"bad","url":"javascript:window.__xss=1"}]}}');
  await page.waitForTimeout(1200);
  check('Security', 'markup and script URLs in JSON are rendered as inert text', await inFrame(() => !window.__xss && !document.querySelector('img[src="x"]') && !document.querySelector('a[href^="javascript"]') && document.querySelector('h1').getAttribute('aria-label').includes('<img')));
  await page.setInputFiles('#st-file', path.join(root, 'e2e/examples/consultant.json'));
  await page.waitForTimeout(1200);
  check('Studio', 'JSON upload replaces the CV', await inFrame(() => document.querySelector('h1').getAttribute('aria-label')) === 'Jonas Abara');
  await page.setInputFiles('#st-file', path.join(root, 'e2e/examples/jsonresume.json'));
  await page.waitForTimeout(1200);
  check('Studio', 'a JSON Resume upload is converted and reported', await inFrame(() => document.querySelector('h1').getAttribute('aria-label')) === 'Noor Example' && (await page.textContent('#st-json-msg')).trim().startsWith('Converted from JSON Resume') && JSON.parse(await page.inputValue('#st-json')).profile.name === 'Noor Example', await page.textContent('#st-json-msg'));
  await page.click('#st-tab-theme'); await page.waitForTimeout(300);
  const sigBefore = [await page.textContent('.st-code-line'), await inFrame(() => document.querySelector('.nav__sigil path').getAttribute('d'))];
  await page.click('text=Roll a new one'); await page.waitForTimeout(1200);
  const sigAfter = [await page.textContent('.st-code-line'), await inFrame(() => document.querySelector('.nav__sigil path').getAttribute('d')), !!(await page.evaluate(() => window.sigilStudio.raw.theme?.seed))];
  check('Studio', 'rolling a new signature changes the mark and is saved in the JSON', sigBefore[0] !== sigAfter[0] && sigBefore[1] !== sigAfter[1] && sigAfter[2], JSON.stringify([sigBefore[0], sigAfter[0], sigBefore[1] !== sigAfter[1], sigAfter[2]]));
  await page.evaluate(() => { const c = document.querySelector('.st-color'); c.value = '#00c2a8'; c.dispatchEvent(new Event('change', { bubbles: true })); }); await page.waitForTimeout(900);
  check('Studio', 'an ink can be replaced by a custom colour', await page.evaluate(() => Object.values(window.sigilStudio.raw.theme.palette)[0] === '#00c2a8'));
  await axe(page, 'Studio, theme tab with signature and ink controls', 'Studio');

  await page.click('.st-actions >> text=Load demo');
  await page.waitForTimeout(900);

  await page.click('.st-bar button[lang="fr"]');
  await page.waitForTimeout(1500);
  check('Languages', 'Studio interface switches to French', (await page.textContent('.st-actions')).includes('Importer un JSON') && (await page.textContent('#st-tab-content')).trim() === 'Contenu' && (await inFrame(() => document.querySelector('.scv').getAttribute('lang'))) === 'fr');
  await axe(page, 'Studio in French', 'Languages');
  await page.click('#st-tab-content'); await page.waitForTimeout(300);
  await page.locator('.st-panel:not([hidden]) .st-field input').nth(1).fill('Directrice du design');
  await page.waitForTimeout(900);
  check('Languages', 'Studio edits the French overlay, not the base content', await page.evaluate(() => { const r = window.sigilStudio.raw; return r.translations.fr.profile.headline === 'Directrice du design' && r.profile.headline === 'Design Engineering Director'; }));
  await page.click('#st-tab-export');
  {
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('.st-export:nth-child(5) button')]);
    const file = path.join(outDir, 'fr-' + dl.suggestedFilename());
    await dl.saveAs(file);
    const text = execFileSync('pdftotext', [file, '-'], { encoding: 'utf8' });
    check('Languages', 'PDF exported in French (headings, dates, accents)', /EXPÉRIENCE/.test(text) && /COMPÉTENCES/.test(text) && /Présent/.test(text) && /Directrice du design/.test(text) && /Göteborg/.test(text), text.split('\n').slice(0, 6).join(' / '));
  }
  await page.click('.st-bar button[lang="en"]');
  await page.waitForTimeout(1200);
  await page.click('.st-actions >> text=Load demo');
  await page.waitForTimeout(900);

  // Give the demo a portrait so the print edition embeds one.
  await page.click('#st-tab-assets');
  await page.setInputFiles('.st-panel:not([hidden]) input[type="file"]', path.join(root, 'e2e/assets/meridian.svg'));
  await page.waitForTimeout(600);
  await page.click('.st-asset >> text=Use as portrait'); await page.waitForTimeout(600);
  await page.click('#st-tab-export');
  await axe(page, 'Studio, export tab', 'Studio');
  const saved = {};
  for (const label of ['Interactive web CV', 'Standalone HTML', 'Accessible PDF', 'Print-ready PDF', 'ATS-friendly PDF', 'Source code', 'CV JSON']) {
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click(`button[aria-label="Export ${label}"]`)]);
    const file = path.join(outDir, dl.suggestedFilename());
    await dl.saveAs(file);
    saved[label] = file;
  }
  const sh = (cmd, args) => { try { return execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); } catch (e) { return `ERR ${e.stdout || ''}${e.stderr || ''}`; } };
  for (const label of ['Accessible PDF', 'Print-ready PDF', 'ATS-friendly PDF']) {
    const info = sh('pdfinfo', [saved[label]]);
    const text = sh('pdftotext', ['-layout', saved[label], '-']);
    const qpdf = sh('qpdf', ['--check', saved[label]]);
    const links = sh('pdfinfo', ['-url', saved[label]]);
    const struct = sh('pdfinfo', ['-struct-text', saved[label]]);
    check('Exports', `${label}: valid file (qpdf --check)`, /No syntax or stream encoding errors/.test(qpdf), qpdf.split('\n').slice(-3).join(' ').slice(0, 160));
    check('Exports', `${label}: tagged, titled`, /Tagged:\s+yes/.test(info) && /Title:\s+Amara Lindqvist/.test(info), info.split('\n').filter((l) => /Tagged|Title|Pages|Page size/.test(l)).join('; '));
    check('Exports', `${label}: selectable text in reading order`, /amara\s+lindqvist/i.test(text) && text.search(/summary/i) < text.search(/experience/i) && text.search(/experience/i) < text.search(/education/i));
    check('Exports', `${label}: live hyperlinks`, /mailto:amara@example\.com/.test(links) && /https:\/\/example\.com/.test(links));
    check('Exports', `${label}: heading and list structure in the tag tree`, /H1/.test(struct) && /H2/.test(struct) && /LBody|LI/.test(struct), struct.split('\n').slice(0, 3).join(' ').slice(0, 120));
    if (label.startsWith('Print')) {
      const imgs = sh('pdfimages', ['-list', saved[label]]);
      const fonts = sh('pdffonts', [saved[label]]);
      check('Exports', 'Print-ready PDF: designed edition with an embedded portrait that has alternative text', /jpeg/.test(imgs) && /Courier/.test(fonts) && /Figure/.test(struct) && /SIG [0-9A-F]{4}-[0-9A-F]{4}/.test(text), imgs.split('\n').slice(2, 3).join(' '));
      const pagesOf = (f) => +(/Pages:\s+(\d+)/.exec(sh('pdfinfo', [f])) || [0, 0])[1];
      await page.check('#st-append');
      const [dl2] = await Promise.all([page.waitForEvent('download'), page.click('button[aria-label="Export Print-ready PDF"]')]);
      const both = path.join(outDir, dl2.suggestedFilename()); await dl2.saveAs(both);
      const text2 = sh('pdftotext', [both, '-']), q2 = sh('qpdf', ['--check', both]);
      check('Exports', 'Print-ready PDF can carry the accessible edition in the same file', /print-accessible\.pdf$/.test(both) && pagesOf(both) > pagesOf(saved[label]) && (text2.match(/amara\s+lindqvist/gi) || []).length >= 2 && /No syntax or stream encoding errors/.test(q2) && /Tagged:\s+yes/.test(sh('pdfinfo', [both])), `${pagesOf(saved[label])} -> ${pagesOf(both)} pages`);
      await page.uncheck('#st-append');
    }
    if (label.startsWith('ATS')) notes.push('ATS text sample:\n' + sh('pdftotext', [saved[label], '-']).split('\n').slice(0, 14).join('\n'));
  }
  check('Exports', 'CV JSON: round-trips', JSON.parse(await readFile(saved['CV JSON'], 'utf8')).profile.name === 'Amara Lindqvist');
  const html = await readFile(saved['Standalone HTML'], 'utf8');
  check('Exports', 'Standalone HTML: embeds content, assets and metadata', html.includes('"Amara Lindqvist"') && html.includes('data:image/svg+xml;base64') && html.includes('application/ld+json') && html.includes('<title>Amara Lindqvist, Design Engineering Director</title>'));
  const sPage = await ctx.newPage();
  const sErrors = []; sPage.on('pageerror', (e) => sErrors.push(String(e).slice(0, 160))); sPage.on('requestfailed', (r) => { if (r.url().startsWith('file:')) sErrors.push('missing ' + r.url().slice(-40)); });
  await sPage.goto('file://' + saved['Standalone HTML']);
  await sPage.waitForTimeout(2500);
  check('Exports', 'Standalone HTML: opens from disk and renders', (await sPage.getAttribute('h1', 'aria-label')) === 'Amara Lindqvist' && sErrors.length === 0 && await sPage.evaluate(() => [...document.querySelectorAll('.scv img')].every((i) => !i.complete || i.naturalWidth > 0)), sErrors.join(' | '));
  await sPage.click('button[data-mode="recruiter"]'); await sPage.waitForTimeout(500);
  check('Exports', 'Standalone HTML: both views and the PDF menu work from disk', await sPage.evaluate(() => !!document.querySelector('.rec') && !!document.querySelector('.rec__dl, .dl')) && sErrors.length === 0, sErrors.join(' | '));
  check('Exports', 'Standalone HTML: contains no Studio controls', !(html.includes('st-bar') || html.includes('Sigil Studio')));
  await sPage.close();
  const list = sh('unzip', ['-l', saved['Interactive web CV']]);
  check('Exports', 'Web package: index.html, cv.json and assets', /index\.html/.test(list) && /cv\.json/.test(list) && /assets\/meridian\.svg/.test(list) && /assets\/rider-flow\.svg/.test(list) && /assets\/field-notes\.svg/.test(list), list.split('\n').filter((l) => /assets/.test(l)).length + ' asset files');
  {
    // Serve the unzipped package from a subfolder, as a static host would, and open it.
    const dir = path.join(outDir, 'web'); await rm(dir, { recursive: true, force: true }); await mkdir(path.join(dir, 'cv'), { recursive: true });
    sh('unzip', ['-o', '-q', saved['Interactive web CV'], '-d', path.join(dir, 'cv')]);
    const server = createServer(async (request, response) => {
      const file = path.join(dir, decodeURIComponent(new URL(request.url, 'http://x').pathname).replace(/\/$/, '/index.html'));
      try { response.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' }); response.end(await readFile(file)); } catch { response.writeHead(404); response.end(); }
    });
    await new Promise((done) => server.listen(0, done));
    const wPage = await ctx.newPage();
    const wErrors = []; wPage.on('pageerror', (e) => wErrors.push(String(e).slice(0, 160))); wPage.on('response', (r) => { if (r.status() >= 400) wErrors.push(`${r.status()} ${r.url().slice(-40)}`); });
    await wPage.goto(`http://localhost:${server.address().port}/cv/`); await wPage.waitForTimeout(2500);
    check('Exports', 'Web package: hosted in a subfolder, it loads cv.json and its assets', (await wPage.getAttribute('h1', 'aria-label').catch(() => '')) === 'Amara Lindqvist' && wErrors.length === 0 && await wPage.evaluate(() => [...document.querySelectorAll('.scv img')].every((i) => !i.complete || i.naturalWidth > 0)), wErrors.join(' | '));
    await wPage.close(); server.close();
  }
  const src = sh('unzip', ['-l', saved['Source code']]).split('\n').slice(1).join('\n'); // without the line that names the archive itself
  check('Exports', 'Source archive: complete project, without dependencies or build output', /sigil-angular\/package\.json/.test(src) && /sigil-angular\/src\/app\/features\/viewer\/viewer-page\.ts/.test(src) && /sigil-angular\/ARCHITECTURE\.md/.test(src) && /sigil-angular\/e2e\/run\.mjs/.test(src) && !/node_modules|sigil-angular\/dist\/|public\/export/.test(src));
  await ctx.close();
});

// ---------------------------------------------------------------- 6. Public build exposes no admin
await section('published CVs', async () => {
  // Every CV shipped in public/ beside the default one: ?cv=name shows name.cv.json.
  const names = (await readdir(path.join(root, 'public'))).filter((f) => f.endsWith('.cv.json')).map((f) => f.replace(/\.cv\.json$/, ''));
  check('Published CVs', 'public/ holds the personal CVs beside the demo', names.length >= 2, names.join(', '));
  for (const name of names) {
    const raw = JSON.parse(await readFile(path.join(root, 'public', `${name}.cv.json`), 'utf8'));
    const { ctx, page, errors } = await open(`/?cv=${name}`);
    const missing = []; page.on('response', (r) => { if (r.status() >= 400) missing.push(`${r.status()} ${r.url().slice(-40)}`); });
    await page.waitForTimeout(600);
    check('Published CVs', `${name}: loads by its name in the address`, (await page.getAttribute('h1', 'aria-label').catch(() => '')) === raw.profile.name && errors.length === 0, errors.join(' | '));
    const portrait = await page.evaluate(async () => {
      const img = document.querySelector('.hero__art img');
      if (!img) return null;
      await img.decode().catch(() => {});
      return { src: img.getAttribute('src'), width: img.naturalWidth, drawn: !!document.querySelector('.hero__art canvas') };
    });
    check('Published CVs', `${name}: the portrait file is there and drawn`, !!portrait && portrait.src === raw.profile.photo.src && portrait.width > 0 && portrait.drawn && missing.length === 0, JSON.stringify(portrait) + ' ' + missing.join(' | '));
    await axe(page, `${name}, opening chapter`, 'Published CVs');
    await page.click('button[data-mode="recruiter"]'); await page.waitForTimeout(500);
    await axe(page, `${name}, recruiter view`, 'Published CVs');
    await ctx.close();
  }
  const { ctx, page } = await open('/?cv=../cv');
  await page.waitForTimeout(400);
  check('Published CVs', 'a name that is not a plain name falls back to cv.json', (await page.getAttribute('h1', 'aria-label').catch(() => '')) === 'Amara Lindqvist');
  await ctx.close();
});

await section('separation', async () => {
  const files = (await readdir(publicDist)).filter((f) => /\.(js|html)$/.test(f));
  const text = (await Promise.all(files.map((f) => readFile(path.join(publicDist, f), 'utf8')))).join('\n');
  check('Separation', 'public CV build contains no Studio code or links', !/Sigil Studio|st-bar|st-panel|studio-page/.test(text), `${files.length} files`);
});

// ---------------------------------------------------------------- 7. Performance indicators
await section('performance', async () => {
  const { ctx, page } = await open('/');
  const perf = await page.evaluate(async () => {
    const nav = performance.getEntriesByType('navigation')[0];
    let frames = 0; const t0 = performance.now();
    await new Promise((res) => { const tick = () => { frames++; if (performance.now() - t0 < 2000) requestAnimationFrame(tick); else res(); }; requestAnimationFrame(tick); });
    return { dcl: Math.round(nav.domContentLoadedEventEnd), nodes: document.querySelectorAll('*').length, fps: Math.round(frames / 2), bytes: performance.getEntriesByType('resource').filter((r) => /\.(js|css)$/.test(new URL(r.name).pathname)).reduce((s, r) => s + (r.decodedBodySize || 0), 0) };
  });
  const files = (await readdir(publicDist)).filter((f) => /\.(js|css|html)$/.test(f));
  let size = 0; for (const f of files) size += (await readFile(path.join(publicDist, f))).length;
  check('Performance', 'public build under 700 KB of HTML, CSS and JS before compression (the reference page is 240 KB)', size < 700_000, `${Math.round(size / 1024)} KB in ${files.length} files`);
  check('Performance', 'DOM ready in under 1 s locally', perf.dcl < 1000, `${perf.dcl} ms, ${perf.nodes} nodes`);
  notes.push(`Frame rate in the test container (software WebGL, no GPU): ${perf.fps} fps. This is a floor, not a device measurement.`);
  await ctx.close();
});

await browser.close();
for (const { server } of servers.values()) server.close();

// ---------------------------------------------------------------- report
const failed = results.filter((r) => r.state === 'fail');
const missing = results.filter((r) => r.state === 'missing');
const passed = results.filter((r) => r.state === 'pass');
const groups = [...new Set(results.map((r) => r.group))];
const word = { pass: 'Pass', fail: '**Fail**', missing: 'Not ported' };
let md = `# End-to-end results, Angular edition\n\nGenerated by \`npm run e2e\` on ${new Date().toISOString().slice(0, 10)}. Chromium (Playwright), axe-core ${require('axe-core/package.json').version}.\n\n**${passed.length} of ${results.length} checks passed, ${failed.length} failed, ${missing.length} not ported.**\n\n`;
for (const g of groups) {
  md += `## ${g}\n\n| Check | Result | Detail |\n|---|---|---|\n`;
  for (const r of results.filter((x) => x.group === g)) md += `| ${r.name} | ${word[r.state]} | ${String(r.detail || '').replace(/\|/g, '/').replace(/\n/g, ' ')} |\n`;
  md += '\n';
}
md += `## Needs human review\n\naxe-core could not decide these rules automatically (typically text over the canvas): ${[...incomplete].join(', ') || 'none'}.\n\n## Notes\n\n${notes.map((n) => '```\n' + n + '\n```').join('\n\n')}\n`;
await writeFile(path.join(root, 'E2E-RESULTS.md'), md);
console.log(`\n${passed.length}/${results.length} passed, ${failed.length} failed, ${missing.length} not ported`);
process.exit(failed.length ? 1 : 0);
