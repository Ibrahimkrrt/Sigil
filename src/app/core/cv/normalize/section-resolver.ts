import { Injectable, inject } from '@angular/core';
import { CvContent } from '@domain/models/cv-content';
import { CvSection } from '@domain/models/cv-section';
import { LooseRecord } from '@domain/models/loose-record';
import { SectionType } from '@domain/models/section-type';
import { ViewMode } from '@domain/models/view-mode';
import { asList } from '@domain/read/as-list';
import { asRecord } from '@domain/read/as-record';
import { asText } from '@domain/read/as-text';
import { isRecord } from '@domain/read/is-record';
import { plainText } from '@domain/text/plain-text';
import { slug } from '@domain/text/slug';
import { Translator } from '../../i18n/translator';
import { BUILT_IN_SECTIONS } from './built-in-sections';
import { SECTION_NAV_LABELS } from './section-nav-labels';
import { SECTION_ORDER } from './section-order';
import { SectionTitler } from './section-titler';

/** Decides which chapters a CV shows, and in which order. */
@Injectable({ providedIn: 'root' })
export class SectionResolver {
  private readonly translator = inject(Translator);
  private readonly titler = inject(SectionTitler);

  resolve(cv: CvContent, includeHidden: boolean): CvSection[] {
    const customs = asList(cv.raw['customSections']).map((custom) => asRecord(custom));
    const used = new Set<string>();
    const out: CvSection[] = [];
    for (const entry of this.entries(cv, customs)) {
      // An entry may point at a custom section by id ("ref", or a bare name) and override parts of it.
      const target = customs.find((custom) => custom['id'] && custom['id'] === (entry['ref'] || entry['type']));
      const source: LooseRecord = target && target !== entry ? { ...target, ...entry, type: 'custom', id: target['id'] } : entry;
      const sourceType = asText(source['type']) || 'custom';
      const builtIn = (BUILT_IN_SECTIONS as readonly string[]).includes(sourceType);
      const hidden = source['visible'] === false;
      if (hidden && !includeHidden) continue;

      const when = asRecord(source['when']);
      const needs = asText(when['has']);
      if (needs && !this.hasData(needs, cv) && !asList(cv.raw[needs]).length) continue;
      if (when['archetype'] && !asList(when['archetype']).includes(cv.archetype)) continue;

      const blocks = asList(source['blocks']).filter(isRecord);
      if (builtIn ? !this.hasData(sourceType, cv) : blocks.length === 0 && !asText(source['text'])) continue;

      const title = asText(source['title']) || this.titler.title(sourceType, cv);
      const navLabel = SECTION_NAV_LABELS[sourceType];
      const modes = asList(when['mode']).filter((mode): mode is ViewMode => mode === 'immersive' || mode === 'recruiter');
      out.push({
        id: this.uniqueId(source, builtIn, sourceType, used),
        type: builtIn ? (sourceType as SectionType) : 'custom',
        sourceType, builtIn, hidden, entry, title,
        nav: asText(source['nav']) || (navLabel ? this.translator.t(navLabel) : '') || plainText(title) || this.translator.t('Section'),
        intro: asText(source['intro']),
        text: asText(source['text']),
        blocks,
        accent: asText(source['accent']) || null,
        ground: asText(source['ground']) || null,
        modes: modes.length ? modes : ['immersive', 'recruiter'],
        options: asRecord(source['options']),
      });
    }
    return out;
  }

  /** The section list as the CV wrote it, or the default order for its archetype. */
  private entries(cv: CvContent, customs: readonly LooseRecord[]): LooseRecord[] {
    const listed = cv.raw['sections'];
    if (Array.isArray(listed) && listed.length) {
      const list = listed.map((section): LooseRecord => (typeof section === 'string' ? { type: section } : asRecord(section)));
      if (!list.some((section) => section['type'] === 'hero')) list.unshift({ type: 'hero' });
      return list;
    }
    // Custom sections with an id are referenced, so overrides can sit beside them.
    return SECTION_ORDER[cv.archetype].flatMap((type): LooseRecord[] => (type === 'custom'
      ? customs.map((custom) => (custom['id'] ? { ref: custom['id'] } : custom))
      : [{ type }]));
  }

  private uniqueId(source: LooseRecord, builtIn: boolean, type: string, used: Set<string>): string {
    const fallback = builtIn ? type : source['title'] ? plainText(source['title']) : 'section';
    let id = slug(source['id'] || fallback, 'section');
    if (id === 'hero') id = 'top';
    while (used.has(id) || id === 'recruiter') id += '-2';
    used.add(id);
    return id;
  }

  private hasData(type: string, cv: CvContent): boolean {
    switch (type) {
      case 'summary': return cv.profile.summary.length > 0 || cv.profile.facts.length > 0;
      case 'experience': return cv.experience.length > 0;
      case 'roles': return cv.positions.some((position) => position.kind === 'role');
      case 'milestones': return cv.milestones.length > 0;
      case 'achievements': return cv.achievements.length > 0;
      case 'projects': return cv.projects.length > 0;
      case 'skills': return cv.skills.technical.length + cv.skills.soft.length + cv.skills.languages.length > 0;
      case 'education': return cv.education.length + cv.certifications.length > 0;
      case 'awards': return cv.awards.length > 0;
      case 'interests': return cv.interests.length > 0;
      default: return true;
    }
  }
}
