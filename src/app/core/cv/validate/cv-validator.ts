import { Injectable, inject } from '@angular/core';
import { parseDate } from '@domain/text/parse-date';
import { safeUrl } from '@domain/text/safe-url';
import { Translator } from '../../i18n/translator';
import { ARCHETYPES } from '../normalize/archetypes';
import { BUILT_IN_SECTIONS } from '../normalize/built-in-sections';
import { BLOCK_TYPES } from './block-types';

/**
 * Checks a CV file and reports what is wrong or doubtful in words a person can act on,
 * lifted from the reference engine. Values are loosely typed inside.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
@Injectable({ providedIn: 'root' })
export class CvValidator {
  private readonly translator = inject(Translator);
  private readonly t = (source: string, vars?: Record<string, string | number>): string => this.translator.t(source, vars);
  private readonly safe = (value: unknown, options?: { image?: boolean }): string | null => safeUrl(value, !!options?.image);

  private isObj: any = (v: any) => v && typeof v === 'object' && !Array.isArray(v);

  /** Parse JSON text safely. Returns { data } or { error }. */
  parseJson(text: any, maxBytes: any = 5_000_000): any {
    if (typeof text !== 'string' || !text.trim()) return { error: this.t('The JSON is empty.') };
    if (text.length > maxBytes) return { error: this.t('The JSON is larger than 5 MB. Move images into asset files.') };
    try {
      const data: any = JSON.parse(text);
      if (!this.isObj(data)) return { error: this.t('The top level of a CV must be a JSON object.') };
      return { data };
    } catch (e: any) {
      return { error: this.t('Not valid JSON: {message}', { message: e.message }) };
    }
  }

  /** Returns { errors: [{path, message}], warnings: [...] }. */
  validate(raw: any, { assets = null }: any = {}): any {
    const errors: any = [], warnings: any = [];
    const err: any = (path: any, message: any) => errors.push({ path, message });
    const warn: any = (path: any, message: any) => warnings.push({ path, message });
    if (!this.isObj(raw)) { err('', this.t('The CV must be a JSON object.')); return { errors, warnings }; }

    const list: any = (key: any) => {
      const v: any = raw[key];
      if (v == null) return [];
      if (!Array.isArray(v)) { err(key, this.t('"{key}" must be a list.', { key })); return []; }
      return v;
    };
    const url: any = (v: any, path: any) => { if (v != null && v !== '' && !this.safe(String(v))) err(path, this.t('Links must start with https://, http://, mailto: or tel:, or be relative paths.')); };
    const img: any = (v: any, path: any) => {
      if (v == null) return;
      const src: any = typeof v === 'string' ? v : this.isObj(v) ? v.src : null;
      if (!src) { err(path, this.t('An image needs a "src".')); return; }
      if (!this.safe(src, { image: true })) err(path, this.t('This image source is not allowed.'));
      else if (assets && !/^(https?:|data:|blob:)/i.test(src) && !assets[src]) warn(path, this.t('Asset "{src}" is not uploaded. A generated visual will be shown instead.', { src }));
      if (this.isObj(v) && !v.alt || typeof v === 'string') warn(path, this.t('Add "alt" text describing this image for screen-reader users.'));
    };
    const date: any = (v: any, path: any) => { if (v != null && v !== '' && !parseDate(v) && !/present|today|now|current/i.test(String(v))) warn(path, this.t('Dates read best as "YYYY" or "YYYY-MM".')); };

    const p: any = raw.profile;
    if (!this.isObj(p)) err('profile', this.t('Add a "profile" object with at least a name.'));
    else {
      if (!p.name && !(p.givenName || p.familyName)) err('profile.name', this.t('The profile needs a name.'));
      if (!p.headline) warn('profile.headline', this.t('A professional headline helps visitors place you at a glance.'));
      if (!p.summary) warn('profile.summary', this.t('A summary powers the Story chapter and recruiter mode.'));
      if (p.archetype && p.archetype !== 'auto' && !ARCHETYPES.includes(p.archetype)) warn('profile.archetype', this.t('Unknown archetype. Use one of: auto, {list}.', { list: ARCHETYPES.join(', ') }));
      img(p.photo, 'profile.photo');
      (Array.isArray(p.photos) ? p.photos : []).forEach((x: any, i: any) => img(x, `profile.photos[${i}]`));
    }

    const c: any = raw.contact;
    if (c != null && !this.isObj(c)) err('contact', this.t('"contact" must be an object.'));
    if (this.isObj(c)) {
      if (c.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(c.email)) err('contact.email', this.t('This does not look like an email address.'));
      url(c.website, 'contact.website');
      (Array.isArray(c.links) ? c.links : []).forEach((l: any, i: any) => url(this.isObj(l) ? l.url : l, `contact.links[${i}].url`));
    }
    if (!this.isObj(c) || (!c.email && !c.phone && !c.website && !(c.links || []).length)) warn('contact', this.t('No contact details yet. Recruiters will have no way to reach you.'));

    list('experience').forEach((e: any, i: any) => {
      const at: any = `experience[${i}]`;
      if (!this.isObj(e)) return err(at, this.t('Each experience must be an object.'));
      if (!e.role && !e.title && !e.company) err(at, this.t('An experience needs a role or a company.'));
      date(e.start, `${at}.start`); date(e.end, `${at}.end`);
      const known: any = Array.isArray(raw.roles) ? raw.roles.map((r: any) => String(this.isObj(r) ? r.id || r.name : r).toLowerCase().replace(/[^a-z0-9]+/g, '-')) : null;
      if (known) (Array.isArray(e.missions || e.highlights) ? e.missions || e.highlights : []).forEach((x: any, j: any) => {
        for (const r of (this.isObj(x) && Array.isArray(x.roles) ? x.roles : [] as any)) if (!known.includes(String(r).toLowerCase().replace(/[^a-z0-9]+/g, '-'))) warn(`${at}.highlights[${j}].roles`, this.t('Mission "{text}" uses the role "{role}", which is not listed in "roles".', { text: String(x.text || '').slice(0, 32), role: r }));
      });
      if (!e.start) warn(`${at}.start`, this.t('Without a start date this role cannot be placed on the timeline.'));
    });
    list('projects').forEach((x: any, i: any) => {
      const at: any = `projects[${i}]`;
      if (!this.isObj(x)) return err(at, this.t('Each project must be an object.'));
      if (!x.title) err(`${at}.title`, this.t('A project needs a title.'));
      img(x.image, `${at}.image`);
      (Array.isArray(x.gallery) ? x.gallery : []).forEach((g: any, j: any) => img(g, `${at}.gallery[${j}]`));
      if (x.link) url(this.isObj(x.link) ? x.link.url : x.link, `${at}.link.url`);
    });
    for (const key of (['milestones', 'education', 'certifications', 'awards', 'interests', 'achievements', 'customSections'] as any)) list(key);
    if (raw.skills != null && !Array.isArray(raw.skills) && !this.isObj(raw.skills)) err('skills', this.t('"skills" must be a list or an object with technical, soft and languages.'));
    (this.isObj(raw.skills) && Array.isArray(raw.skills.technical) ? raw.skills.technical : []).forEach((s: any, i: any) => {
      if (this.isObj(s) && s.level != null && (typeof s.level !== 'number' || s.level < 0 || s.level > 100)) err(`skills.technical[${i}].level`, this.t('Skill level must be a number from 0 to 100.'));
    });

    const checkBlocks: any = (blocks: any, at: any) => (Array.isArray(blocks) ? blocks : []).forEach((b: any, j: any) => {
      const path: any = `${at}.blocks[${j}]`;
      if (!this.isObj(b)) return err(path, this.t('Each block must be an object with a "type".'));
      if (!b.type) return err(`${path}.type`, this.t('A block needs a "type".'));
      if (!BLOCK_TYPES.includes(b.type)) warn(`${path}.type`, this.t('Unknown block type "{type}". Its title and text will be shown as plain content.', { type: b.type }));
      if (b.type === 'image') img(b, path);
      if (b.type === 'gallery') (Array.isArray(b.items) ? b.items : []).forEach((g: any, k: any) => img(g, `${path}.items[${k}]`));
      if (b.type === 'video' && !b.src) warn(`${path}.src`, this.t('A video block without "src" is skipped.'));
      if (b.type === 'chart' && !(Array.isArray(b.data) && b.data.length)) err(`${path}.data`, this.t('A chart needs a "data" list of { label, value }.'));
      if (b.type === 'links') (Array.isArray(b.items) ? b.items : []).forEach((l: any, k: any) => url(this.isObj(l) ? l.url : l, `${path}.items[${k}].url`));
    });
    list('customSections').forEach((s: any, i: any) => {
      const at: any = `customSections[${i}]`;
      if (!this.isObj(s)) return err(at, this.t('Each custom section must be an object.'));
      if (!s.title) warn(`${at}.title`, this.t('Give the section a title so it appears in navigation.'));
      checkBlocks(s.blocks, at);
    });
    if (raw.sections != null) {
      if (!Array.isArray(raw.sections)) err('sections', this.t('"sections" must be a list of section names or objects.'));
      else raw.sections.forEach((s: any, i: any) => {
        const type: any = typeof s === 'string' ? s : this.isObj(s) ? s.type || s.ref : null;
        if (!type) return err(`sections[${i}]`, this.t('Each entry needs a section name or a "type".'));
        const custom: any = (Array.isArray(raw.customSections) ? raw.customSections : []).some((cs: any) => this.isObj(cs) && cs.id === type);
        if (!BUILT_IN_SECTIONS.includes(type) && type !== 'custom' && !custom && !(this.isObj(s) && Array.isArray(s.blocks))) warn(`sections[${i}]`, this.t('"{type}" is not a built-in section or a custom section id, so it will be skipped.', { type }));
        if (this.isObj(s)) checkBlocks(s.blocks, `sections[${i}]`);
      });
    }

    const th: any = raw.theme;
    if (th != null && !this.isObj(th)) err('theme', this.t('"theme" must be an object.'));
    if (this.isObj(th)) {
      if (th.mode && !['mixed', 'dark', 'light', 'auto'].includes(th.mode)) warn('theme.mode', this.t('Theme mode is one of: mixed, dark, light, auto.'));
      if (th.density && !['compact', 'comfortable', 'spacious'].includes(th.density)) warn('theme.density', this.t('Density is one of: compact, comfortable, spacious.'));
      if (this.isObj(th.palette)) for (const [k, v] of (Object.entries(th.palette) as any)) {
        const hex: any = typeof v === 'string' ? v : this.isObj(v) ? v.base : '';
        if (!/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex || '')) err(`theme.palette.${k}`, this.t('Palette colours must be hex values such as "#FE5000".'));
      }
    }
    if (raw.translations != null && !this.isObj(raw.translations)) err('translations', this.t('"translations" must be an object keyed by language code, for example { "fr": { ... } }.'));
    return { errors, warnings };
  }
}
