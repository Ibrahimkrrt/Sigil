import { Injectable, inject } from '@angular/core';
import { hexToRgb } from '@domain/color/hex-to-rgb';
import { plainText } from '@domain/text/plain-text';
import { safeUrl } from '@domain/text/safe-url';
import { slug } from '@domain/text/slug';
import { DateFormatter } from '../format/date-formatter';
import { Translator } from '../i18n/translator';
import { Signature } from '../signature/signature';
import { ChapterPainter } from '../theme/chapter-painter';
import { PdfWriter } from './pdf-writer';

/**
 * Lays a CV out as a PDF, lifted from the reference engine: the plain editions (ATS and
 * accessible) and the designed print edition, alone or with the accessible one appended.
 * Values are loosely typed inside; `buildCvPdf` and `pdfFileName` are its public entries.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
@Injectable({ providedIn: 'root' })
export class CvPdfBuilder {
  private readonly translator = inject(Translator);
  private readonly dates = inject(DateFormatter);
  private readonly signature = inject(Signature);
  private readonly painter = inject(ChapterPainter);
  private readonly writer = inject(PdfWriter);
  private readonly t = (source: string, vars?: Record<string, string | number>): string => this.translator.t(source, vars);
  private readonly fmtRange = (start: string, end: string | null, options: { month?: boolean; present?: string; sep?: string } = {}): string => {
    const from = start ? this.dates.date(start, !!options.month) : '';
    const to = end ? this.dates.date(end, !!options.month) : (options.present ?? this.translator.t('today'));
    if (!from) return end ? to : '';
    return from === to ? from : `${from}${options.sep ?? this.translator.t(' to ')}${to}`;
  };

  private PRESETS: any = {
    ats: { label: 'ATS', base: 10.5, lead: 1.38, margin: 56, name: 18, h2: 12, h3: 10.5, upper: true, bullet: '-', accent: null, rightDates: false, footer: false, underline: false, linkColor: null },
    accessible: { label: 'accessible', base: 12, lead: 1.5, margin: 64, name: 24, h2: 16, h3: 13, upper: false, bullet: '•', accent: null, rightDates: false, footer: true, underline: true, linkColor: [0, 74, 174] },
    print: { label: 'print', base: 9.5, lead: 1.42, margin: 48, name: 26, h2: 12.5, h3: 10.5, upper: false, bullet: '•', accent: [254, 80, 0], rightDates: true, footer: true, underline: false, linkColor: [0, 74, 174] },
  };

  /** Parse **bold** and [label](url) into PDF runs. */
  private runs(text: any, base: any = {}): any {
    const out: any = [];
    const re: any = /(\*\*[^*\n]+\*\*|\*[^*\n]+\*|\[[^\]\n]+\]\([^)\s]+\))/g;
    const s: any = String(text ?? '');
    let last: any = 0;
    for (const m of (s.matchAll(re) as any)) {
      if (m.index > last) out.push({ ...base, text: s.slice(last, m.index) });
      const t: any = m[0];
      if (t.startsWith('**')) out.push({ ...base, text: t.slice(2, -2), bold: true });
      else if (t.startsWith('*')) out.push({ ...base, text: t.slice(1, -1) });
      else { const mm: any = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(t); const url: any = safeUrl(mm[2]); out.push({ ...base, text: mm[1], link: url && /^(https?:|mailto:)/i.test(url) ? url : undefined }); }
      last = m.index + t.length;
    }
    if (last < s.length) out.push({ ...base, text: s.slice(last) });
    return out;
  }

  /** The plain editions (ATS, accessible): one column of headings, paragraphs and lists. */
  private plainFlow(model: any, preset: any): any {
    const P: any = this.PRESETS[preset] || this.PRESETS.ats;
    const m: any = model;
    const blocks: any = [];
    const p: any = (text: any, extra: any = {}) => { if (text) blocks.push({ tag: 'P', runs: this.runs(text), size: P.base, leading: P.lead, after: P.base * 0.35, ...extra }); };
    const h2: any = (text: any) => blocks.push({ tag: 'H2', runs: [{ text: P.upper ? text.toUpperCase() : text, bold: true }], size: P.h2, leading: 1.25, before: P.base * 1.1, after: P.base * 0.45, keep: true, dot: P.accent, rule: !P.accent && preset === 'ats' });
    const h3: any = (text: any, right: any) => blocks.push({ tag: 'H3', runs: [{ text, bold: true }], size: P.h3, leading: 1.3, before: P.base * 0.5, after: 1, keep: true, right: P.rightDates ? right : undefined });
    const li: any = (text: any) => blocks.push({ tag: 'LI', runs: this.runs(text), size: P.base, leading: P.lead, indent: 14, bullet: P.bullet, after: 1.5 });
    const meta: any = (text: any) => p(text, { color: [74, 79, 89], after: P.base * 0.25 });

    // Header: name, headline, contact details as real text and real links.
    blocks.push({ tag: 'H1', runs: [{ text: m.profile.name, bold: true }], size: P.name, leading: 1.2, after: 2 });
    if (m.profile.headline) p(m.profile.headline, { size: P.base + 1.5, after: 4 });
    const c: any = m.contact;
    const contact: any = [];
    const sep: any = () => { if (contact.length) contact.push({ text: '|' }); };
    if (m.profile.location) contact.push({ text: m.profile.location });
    if (c.email) { sep(); contact.push({ text: c.email, link: `mailto:${c.email}` }); }
    if (c.phone) { sep(); contact.push({ text: c.phone }); }
    if (c.website && safeUrl(c.website)) { sep(); contact.push({ text: c.website.replace(/^https?:\/\//, ''), link: c.website }); }
    for (const l of (c.links as any)) if (/^https?:/i.test(l.url)) { sep(); contact.push({ text: `${l.label}: ${l.url.replace(/^https?:\/\//, '')}`, link: l.url }); }
    if (contact.length) blocks.push({ tag: 'P', runs: contact, size: P.base, leading: P.lead, after: P.base * 0.3 });

    if (m.profile.summary.length) { h2(this.t('Summary')); m.profile.summary.forEach((s: any) => p(preset === 'ats' ? plainText(s) : s)); }

    if (m.experience.length) {
      h2(this.t('Experience'));
      for (const e of (m.experience as any)) {
        const range: any = this.fmtRange(e.start, e.current ? null : e.end, { month: true, present: this.t('Present'), sep: ' - ' });
        h3([e.role, e.company].filter(Boolean).join(', '), range);
        meta([e.employer ? this.t('Client mission, via {name}', { name: e.employer }) : '', e.location, P.rightDates ? '' : range].filter(Boolean).join(' | '));
        if (e.summary) p(plainText(e.summary));
        e.highlights.forEach((t: any) => li(plainText(t)));
        if (e.tags.length && preset !== 'accessible') meta(`${this.t('Skills')}: ${e.tags.join(', ')}`);
      }
    }
    if (m.achievements.length) { h2(this.t('Key achievements')); m.achievements.forEach((a: any) => li(`${a.value} ${plainText(a.label)}`.trim())); }

    const sk: any = m.skills;
    if (sk.technical.length || sk.soft.length) {
      h2(this.t('Skills'));
      const groups: any = [...new Set(sk.technical.map((t: any) => t.group || ''))];
      for (const g of (groups as any)) {
        const names: any = sk.technical.filter((t: any) => (t.group || '') === g).map((t: any) => t.name).join(', ');
        p(g ? `**${g}:** ${names}` : names);
      }
      if (sk.soft.length) p(`**${this.t('Professional')}:** ${sk.soft.join(', ')}`);
    }
    if (m.projects.length) {
      h2(this.t('Projects'));
      for (const x of (m.projects as any)) {
        h3(x.title, x.year);
        meta([x.role, P.rightDates ? '' : x.year].filter(Boolean).join(' | '));
        p(plainText([x.summary, x.outcome].filter(Boolean).join(' ')));
        if (x.link && /^https?:/i.test(x.link.url)) blocks.push({ tag: 'P', runs: [{ text: x.link.url.replace(/^https?:\/\//, ''), link: x.link.url }], size: P.base, leading: P.lead, after: 3 });
      }
    }
    if (m.education.length) {
      h2(this.t('Education'));
      for (const e of (m.education as any)) {
        const when: any = this.fmtRange(e.start, e.end, { present: '', sep: ' - ' }) || e.end;
        h3([e.degree, e.school].filter(Boolean).join(', '), when);
        meta([P.rightDates ? '' : when, e.detail].filter(Boolean).join(' | '));
      }
    }
    if (m.certifications.length) { h2(this.t('Certifications')); m.certifications.forEach((x: any) => li([x.title, x.issuer, x.year].filter(Boolean).join(', '))); }
    if (m.awards.length) { h2(this.t('Awards')); m.awards.forEach((x: any) => li([x.title, x.issuer, x.year].filter(Boolean).join(', '))); }
    if (sk.languages.length) { h2(this.t('Languages')); p(sk.languages.map((l: any) => (l.level ? `${l.name} (${l.level})` : l.name)).join(', ')); }
    if (m.interests.length) { h2('Interests'); p(m.interests.join(', ')); }

    // Custom sections contribute their text content.
    for (const s of (m.sections.filter((x: any) => x.type === 'custom' && x.modes.includes('recruiter')) as any)) {
      const texts: any = [s.text, ...s.blocks.map((b: any) => (['text', 'richtext', 'quote'].includes(b.type) || !b.type ? b.text : b.type === 'list' && Array.isArray(b.items) ? b.items.join('; ') : ''))].filter(Boolean);
      if (!texts.length) continue;
      h2(plainText(s.title) || s.nav);
      texts.forEach((t: any) => p(preset === 'ats' ? plainText(t) : t));
    }
    if (m.meta.demoNotice) p(m.meta.demoNotice, { color: [74, 79, 89], before: P.base });

    return blocks;
  }

  private rgbOf: any = (hex: any) => hexToRgb(hex) || [0, 0, 0];

  // "AI" in English, "IA" in French, as a word of its own: not the letters inside "Maintenance".
  private AI_WORD: any = /(^|[^A-Za-zÀ-ÿ])(AI|IA)(?![A-Za-zÀ-ÿ])/;

  private AI_GRADIENT: any = [[79, 70, 229], [147, 51, 234], [219, 39, 119]];

  /**
   * The print edition: a designed page in the same two-colour identity as the
   * site. An ink band carries the name set large and condensed, the signature
   * mark and an optional portrait; below it, monospaced section labels, dates as
   * filled labels, a rail down each position, and skills as cards.
   */
  private designFlow(m: any, { images = {}, size = 'a4', append = false }: any = {}): any {
    const self = this;
    const PAGE_W: any = (this.writer.PAGE_SIZES[size] || this.writer.PAGE_SIZES.a4)[0];
    const dark: any = m.theme.pdf.ground === 'ink';
    const v: any = this.painter.paint.bind(this.painter)(m.theme.inks, m.theme.lead, dark ? 'night' : 'white').vars;
    const band: any = this.painter.paint.bind(this.painter)(m.theme.inks, m.theme.lead, 'night').vars;
    const C: any = {
      bg: dark ? this.rgbOf(v['--ground']) : [255, 255, 255], fg: this.rgbOf(v['--fg']), soft: this.rgbOf(v['--fg-soft']), line: dark ? this.rgbOf(v['--line']) : [176, 175, 170],
      accent: this.rgbOf(v['--accent']), onAccent: this.rgbOf(v['--on-accent']), accentText: this.rgbOf(v['--ink-small']), display: this.rgbOf(v['--ink']),
      bandBg: this.rgbOf(band['--ground']), bandFg: this.rgbOf(band['--fg']), bandSoft: this.rgbOf(band['--fg-soft']), bandInk: this.rgbOf(band['--ink']),
    };
    const M: any = 42, base: any = 9.3, lead: any = 1.42;
    const blocks: any = [];
    const DISPLAY: any = { bold: true, scaleX: 0.74 };
    const MONO: any = { mono: true, tracking: 0.5 };
    const up: any = (x: any) => String(x).toUpperCase();
    const p: any = (text: any, extra: any = {}) => { if (text) blocks.push({ tag: 'P', runs: this.runs(text), size: base, leading: lead, after: base * 0.4, ...extra }); };
    const h2: any = (text: any) => blocks.push({ tag: 'H2', runs: [{ text: up(text), bold: true }], mono: true, tracking: 1.1, size: 8.2, leading: 1.3, before: 15, after: 8, keep: true, keepSpace: 78, square: C.accent, lineAfter: C.line });
    const label: any = (text: any, extra: any = {}) => { if (text) blocks.push({ tag: 'P', runs: [{ text: up(text) }], mono: true, tracking: 0.4, size: 6.9, leading: 1.5, color: C.soft, after: 3, ...extra }); };

    // ---- The band
    const p0: any = m.profile, c: any = m.contact;
    const hasPhoto: any = !!images.portrait;
    const bandH: any = 186, artW: any = 104;
    const contact: any = [];
    if (p0.location) contact.push({ text: p0.location });
    if (c.email) contact.push({ text: c.email, link: `mailto:${c.email}` });
    if (c.phone) contact.push({ text: c.phone });
    if (c.website && safeUrl(c.website)) contact.push({ text: c.website.replace(/^https?:\/\//, ''), link: c.website });
    for (const l of (c.links as any)) if (/^https?:/i.test(l.url)) contact.push({ text: l.url.replace(/^https?:\/\/(www\.)?/, ''), link: l.url });
    blocks.push({
      height: bandH, bleed: true, advance: bandH - M + 4, after: 4,
      draw(g: any) {
        const top: any = g.PH, left: any = g.margin, right: any = g.PW - g.margin;
        g.rect(0, top - bandH, g.PW, bandH, C.bandBg);
        g.rect(0, top - bandH - 5, g.PW, 5, C.accent);
        // Top line: what this is, and whose signature it carries.
        const sigText: any = `SIG ${m.theme.code}`;
        g.text('P', up(self.t('Curriculum vitae')), left, top - 30, { size: 6.6, color: C.bandSoft, ...MONO });
        const sigW: any = g.width(sigText, 6.6, MONO);
        const grid: any = self.signature.grid.bind(self.signature)(m.theme.seed), cell: any = 9 / 7;
        g.rect(right - sigW - 16, top - 33, 11, 11, C.accent);
        grid.forEach((row: any, yy: any) => row.forEach((on: any, xx: any) => { if (on) g.rect(right - sigW - 15 + xx * cell, top - 23 - (yy + 1) * cell, cell, cell, C.onAccent); }));
        g.text('P', sigText, right - sigW, top - 30, { size: 6.6, color: C.bandSoft, ...MONO });
        g.line(left, top - 40, right, top - 40, [70, 70, 74], 0.5);
        // Portrait, or the signature mark large when there is none.
        const ax: any = right - artW, ay: any = top - 52 - artW;
        g.rect(ax + 6, ay - 6, artW, artW, C.accent);
        if (!(hasPhoto && g.image('portrait', ax, ay, artW, artW, self.t('Portrait of {name}', { name: p0.name })))) {
          g.rect(ax, ay, artW, artW, C.bandBg); const cs: any = artW / 9;
          grid.forEach((row: any, yy: any) => row.forEach((on: any, xx: any) => { if (on) g.rect(ax + cs + xx * cs, ay + artW - cs - (yy + 1) * cs, cs + 0.2, cs + 0.2, C.accent); }));
        }
        g.rect(ax, ay, artW, artW, C.bandFg, { stroke: true, lw: 0.8 });
        // The name, as large as the space allows.
        const lines: any = [p0.given, p0.family].filter(Boolean).map(up);
        const avail: any = ax - left - 22;
        const size: any = Math.min(50, ...lines.map((ln: any) => (avail / g.width(ln, 100, DISPLAY)) * 100));
        const h1: any = g.elem('H1');
        g.bookmark(p0.name, 0);
        lines.forEach((ln: any, i: any) => g.text(h1, ln + (i < lines.length - 1 ? ' ' : ''), left, top - 52 - size * 0.76 - i * size * 0.9, { size, color: i === 0 ? C.bandFg : C.bandInk, ...DISPLAY }));
        let yy: any = top - 52 - size * 0.76 - (lines.length - 1) * size * 0.9 - 17;
        if (p0.headline) { for (const ln of (g.wrap(up(plainText(p0.headline)), avail, 7.6, MONO) as any)) { g.text('P', ln, left, yy, { size: 7.6, color: C.bandFg, bold: true, ...MONO }); yy -= 11; } }
        // Contact details, wrapped, each one a real link where it can be.
        yy = Math.min(yy - 2, top - bandH + 30);
        const el: any = g.elem('P');
        let x: any = left;
        contact.forEach((it: any, i: any) => {
          const w: any = g.width(it.text, 7.2, { mono: true });
          if (x > left && x + w > ax - 16) { x = left; yy -= 11; }
          g.text(el, it.text, x, yy, { size: 7.2, color: C.bandFg, mono: true, link: it.link });
          x += w;
          if (i < contact.length - 1) { g.text(el, '  /  ', x, yy, { size: 7.2, color: C.bandSoft, mono: true }); x += g.width('  /  ', 7.2, { mono: true }); }
        });
      },
    });

    const sk: any = m.skills;
    // ---- Profile
    if (p0.summary.length) { h2(this.t('Summary')); p0.summary.forEach((s: any, i: any) => p(s, i === 0 ? { size: 11, leading: 1.36, after: 6 } : {})); }

    // ---- Skills as cards
    if (sk.technical.length || sk.soft.length) {
      h2(this.t('Skills'));
      const groups: any = [...new Set(sk.technical.map((x: any) => x.group || ''))].map((g0: any) => ({ label: g0 || this.t('Skills'), text: sk.technical.filter((x: any) => (x.group || '') === g0).map((x: any) => x.name).join(', ') }));
      if (sk.soft.length) groups.push({ label: this.t('Professional'), text: sk.soft.join(', ') });
      const cols: any = Math.min(3, groups.length), gap: any = 8;
      for (let r: any = 0; r < groups.length; r += cols) {
        const row: any = groups.slice(r, r + cols);
        const cw: any = (PAGE_W - 2 * M - gap * (cols - 1)) / cols;
        const wrapAll: any = row.map((it: any) => this.wrapText(it.text, cw - 18, base));
        const hgt: any = 30 + Math.max(...wrapAll.map((w: any) => w.length)) * base * 1.36;
        blocks.push({ height: hgt, after: gap, draw(g: any) {
          row.forEach((it: any, i: any) => {
            const x: any = g.x + i * (cw + gap), top: any = g.top;
            // Hidden joke: anything that says AI (or IA) gets the gradient every AI product ships with.
            const ai: any = self.AI_WORD.test(`${it.label} ${it.text}`), white: any = [255, 255, 255];
            if (ai) g.gradient(x, top - hgt, cw, hgt, self.AI_GRADIENT);
            else { g.rect(x, top - hgt, cw, hgt, C.line, { stroke: true }); g.rect(x, top - 3, cw, 3, i === 0 && r === 0 ? C.accent : C.fg); }
            const el: any = g.elem('P');
            g.text(el, `${up(it.label)}: `, x + 9, top - 17, { size: 6.9, bold: true, color: ai ? white : C.accentText, ...MONO });
            wrapAll[i].forEach((ln: any, k: any) => g.text(el, `${ln} `, x + 9, top - 31 - k * base * 1.36, { size: base, color: ai ? white : C.fg }));
          });
        } });
      }
    }

    // ---- Impact: a row of large numbers
    if (m.achievements.length) {
      h2(this.t('Key achievements'));
      const items: any = m.achievements.slice(0, 4), n: any = items.length;
      const cellH: any = 62;
      blocks.push({ height: cellH, after: 4, draw(g: any) {
        const w: any = g.w / n;
        items.forEach((a: any, i: any) => {
          const x: any = g.x + i * w, top: any = g.top;
          g.rect(x, top - cellH, w, cellH, C.line, { stroke: true });
          const el: any = g.elem('P');
          g.text(el, `${a.value} `, x + 8, top - 30, { size: 27, color: C.display, ...DISPLAY });
          g.wrap(up(plainText(a.label)), w - 16, 6.2, MONO).slice(0, 3).forEach((ln: any, k: any) => g.text(el, `${ln} `, x + 8, top - 40 - k * 8, { size: 6.2, color: C.soft, ...MONO }));
        });
      } });
    }

    // ---- Experience: a rail down each position, the dates as a filled label
    if (m.experience.length) {
      h2(this.t('Experience'));
      m.experience.forEach((e: any, i: any) => {
        const range: any = this.fmtRange(e.start, e.current ? null : e.end, { month: true, present: this.t('Present'), sep: ' - ' });
        // A client mission hangs off the employer above it: indented, no node of its own.
        const inset: any = e.sub ? 13 : 0;
        const rail: any = { rail: C.line, indent: 18 + inset };
        blocks.push({ tag: 'H3', runs: [{ text: e.role || e.company, bold: true }, ...(e.role && e.company ? [{ text: `  /  ${e.company}`, color: C.accentText, bold: true }] : [])], size: e.sub ? 10 : 11, leading: 1.3, before: i ? (e.sub ? 6 : 9) : 0, after: 1.5, keep: true, right: up(range), badge: e.sub ? { fill: C.line, color: C.fg } : { fill: C.fg, color: C.bg }, node: e.sub ? undefined : C.accent, ...rail });
        if (e.location || e.employer) label([e.employer ? this.t('Client mission, via {name}', { name: e.employer }) : '', e.location].filter(Boolean).join('  ·  '), { ...rail, after: 3 });
        if (e.summary) p(plainText(e.summary), { ...rail, color: C.soft });
        e.highlights.forEach((x: any) => blocks.push({ tag: 'LI', runs: this.runs(plainText(x)), size: base, leading: lead, indent: 31 + inset, bullet: '-', bulletBox: C.accent, after: 1.8, rail: C.line }));
        if (e.tags.length) label(`${this.t('Stack')}   ${e.tags.join('  ·  ')}`, { ...rail, before: 2, after: 2 });
      });
    }

    if (m.projects.length) {
      h2(this.t('Projects'));
      for (const x of (m.projects as any)) {
        blocks.push({ tag: 'H3', runs: [{ text: x.title, bold: true }], size: 10.5, leading: 1.3, before: 5, after: 1.5, keep: true, right: x.year ? up(x.year) : undefined, badge: { fill: C.fg, color: C.bg } });
        if (x.role) label(x.role);
        p(plainText([x.summary, x.outcome].filter(Boolean).join(' ')));
        if (x.link && /^https?:/i.test(x.link.url)) blocks.push({ tag: 'P', runs: [{ text: x.link.url.replace(/^https?:\/\//, ''), link: x.link.url }], mono: true, size: 7.4, leading: lead, after: 3 });
      }
    }
    if (m.education.length) {
      h2(this.t('Education'));
      for (const e of (m.education as any)) {
        const when: any = this.fmtRange(e.start, e.end, { present: '', sep: ' - ' }) || e.end;
        blocks.push({ tag: 'H3', runs: [{ text: e.degree || e.school, bold: true }, ...(e.degree && e.school ? [{ text: `  /  ${e.school}`, color: C.accentText, bold: true }] : [])], size: 10.2, leading: 1.3, before: 3, after: 1.5, keep: true, right: when ? up(when) : undefined, badge: { fill: C.fg, color: C.bg } });
        if (e.detail) p(e.detail, { color: C.soft });
      }
    }
    const li: any = (text: any) => blocks.push({ tag: 'LI', runs: this.runs(text), size: base, leading: lead, indent: 14, bullet: '-', bulletBox: C.accent, after: 1.8 });
    if (m.certifications.length) { h2(this.t('Certifications')); m.certifications.forEach((x: any) => li([x.title, x.issuer, x.year].filter(Boolean).join(', '))); }
    if (m.awards.length) { h2(this.t('Awards')); m.awards.forEach((x: any) => li([x.title, x.issuer, x.year].filter(Boolean).join(', '))); }
    if (sk.languages.length) { h2(this.t('Languages')); p(sk.languages.map((l: any) => (l.level ? `**${l.name}** (${l.level})` : `**${l.name}**`)).join('   ')); }
    if (m.interests.length) { h2(this.t('Interests')); p(m.interests.join(', ')); }
    for (const s of (m.sections.filter((x: any) => x.type === 'custom' && x.modes.includes('recruiter')) as any)) {
      const texts: any = [s.text, ...s.blocks.map((b: any) => (['text', 'richtext', 'quote'].includes(b.type) || !b.type ? b.text : b.type === 'list' && Array.isArray(b.items) ? b.items.join('; ') : ''))].filter(Boolean);
      if (!texts.length) continue;
      h2(plainText(s.title) || s.nav);
      texts.forEach((x: any) => p(x));
    }
    if (m.meta.demoNotice) label(m.meta.demoNotice, { before: 10 });
    if (append) blocks.push({ tag: 'P', runs: [{ text: up(`${this.t('End of the print edition')}  ·  ${this.t('Accessible edition follows')}`) }], mono: true, tracking: 0.5, size: 6.9, leading: 1.5, color: C.soft, before: 16, keep: true, square: C.accent });
    // The page that separates the two editions when they share a file.
    const divider: any = { height: 0, bleed: true, advance: 2000, draw(g: any) {
      g.rect(0, 0, g.PW, g.PH, C.bandBg);
      g.rect(0, g.PH * 0.5 - 60, g.PW, 6, C.accent);
      const grid: any = self.signature.grid.bind(self.signature)(m.theme.seed), cs: any = 9;
      g.rect(M, g.PH * 0.5 + 150, 81, 81, C.accent);
      grid.forEach((row: any, yy: any) => row.forEach((on: any, xx: any) => { if (on) g.rect(M + cs + xx * cs, g.PH * 0.5 + 150 + 81 - cs - (yy + 1) * cs, cs + 0.2, cs + 0.2, C.onAccent); }));
      g.text('P', up(self.t('Part {n} of {total}', { n: 2, total: 2 })), M, g.PH * 0.5 + 118, { size: 8, color: C.bandSoft, ...MONO });
      const el: any = g.elem('P');
      const words: any = up(self.t('Accessible edition')).split(' ');
      const size: any = Math.min(84, ...words.map((w: any) => ((g.PW - 2 * M) / g.width(w, 100, DISPLAY)) * 100));
      words.forEach((w: any, i: any) => g.text(el, `${w} `, M, g.PH * 0.5 + 100 - size * 0.76 - i * size * 0.9, { size, color: i === words.length - 1 ? C.bandInk : C.bandFg, ...DISPLAY }));
      const note: any = g.elem('P');
      g.wrap(self.t('The same CV in larger type, WCAG 2.0 compatible, with AA/AAA-compliant contrast.'), g.PW - 2 * M - 120, 13, {}).forEach((ln: any, i: any) => g.text(note, `${ln} `, M, g.PH * 0.5 - 92 - i * 19, { size: 13, color: C.bandFg }));
    } };
    return { divider, blocks, margin: M, background: dark ? C.bg : null, ink: C.fg, linkColor: dark ? C.accentText : C.fg === C.accentText ? [31, 43, 214] : C.accentText, underlineLinks: true, footer: `${p0.name}  ·  SIG ${m.theme.code}${append ? `  ·  ${this.t('Print edition')}` : ''}`, footerColor: C.soft, monoFooter: true };
  }

  /** Word-wrap with the standard font metrics (used to size cards before they are drawn). */
  private wrapText(str: any, maxW: any, size: any): any {
    const out: any = []; let cur: any = '';
    for (const w of (String(str).split(/\s+/).filter(Boolean) as any)) { const next: any = cur ? `${cur} ${w}` : w; if (cur && this.writer.textWidth(next, size, false) > maxW) { out.push(cur); cur = w; } else cur = next; }
    if (cur) out.push(cur);
    return out;
  }

  /**
   * Build a CV PDF.
   * @param {'ats'|'accessible'|'print'} preset
   * @param {{ size?: 'a4'|'letter', images?: object, append?: boolean }} opts  `append` adds the accessible edition after the print one, in the same file.
   */
  buildCvPdf(model: any, preset: any = 'ats', { size = 'a4', images = {}, append = false }: any = {}): any {
    const m: any = model, sk: any = m.skills;
    const P: any = this.PRESETS[preset] || this.PRESETS.ats;
    const plainPart: any = (name: any) => { const Q: any = this.PRESETS[name]; return { blocks: this.plainFlow(m, name), margin: Q.margin, footer: Q.footer ? m.profile.name : '', linkColor: Q.linkColor, underlineLinks: Q.underline }; };
    let parts: any;
    if (preset === 'print') {
      const { divider, ...design }: any = this.designFlow(m, { images, size, append });
      parts = [{ ...design, bookmark: append ? this.t('Print edition') : undefined }];
      if (append) {
        // The accessible edition opens on its own title page, and its footers say which edition they belong to.
        const acc: any = plainPart('accessible');
        parts.push({ ...acc, blocks: [divider, ...acc.blocks], footer: `${m.profile.name}  ·  ${this.t('Accessible edition')}`, bookmark: this.t('Accessible edition') });
      }
    } else parts = [plainPart(preset)];
    const keywords: any = [...sk.technical.map((t: any) => t.name), ...sk.soft].slice(0, 30).join(', ');
    return this.writer.renderPdf.bind(this.writer)(parts, {
      title: `${m.profile.name}${m.profile.headline ? ', ' + m.profile.headline : ''}`,
      author: m.profile.name, subject: this.t('Curriculum vitae ({label} edition)', { label: preset === 'print' && append ? `${P.label} + accessible` : P.label }), keywords, lang: m.meta.lang,
      size, images,
    });
  }

  pdfFileName: any = (model: any, preset: any, { append = false }: any = {}) => `${slug(model.profile.name, 'cv')}-cv-${preset}${append ? '-accessible' : ''}.pdf`;
}
