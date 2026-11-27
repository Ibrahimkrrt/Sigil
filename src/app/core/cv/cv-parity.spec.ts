import { TestBed } from '@angular/core/testing';
import { CvModel } from '@domain/models/cv-model';
import fixtures from '../../../testing/parity-fixtures.json';
import { CvLocalizer } from '../i18n/cv-localizer';
import { Translator } from '../i18n/translator';
import { CvAdapter } from './import/cv-adapter';
import { ChapterInkAssigner } from './normalize/chapter-ink-assigner';
import { CvNormalizer } from './normalize/cv-normalizer';

/**
 * Parity with the framework-free reference engine. The fixtures hold what it makes of
 * every example CV in every language; this port must make the same of them.
 * Regenerate with `node tools/make-fixtures.mjs <path to the reference>`.
 */
describe('CV content pipeline, against the reference engine', () => {
  const round = (n: number): number => Math.round(n * 100) / 100;

  const project = (model: CvModel, assigner: ChapterInkAssigner): unknown => ({
    meta: model.meta, profile: model.profile, contact: model.contact,
    experience: model.experience.map((e) => ({
      id: e.id, role: e.role, company: e.company, location: e.location, start: e.start, end: e.end, current: e.current,
      summary: e.summary, stats: e.stats, highlights: e.highlights, roles: e.roles, roleIds: e.roleIds, tags: e.tags,
      team: e.team, employer: e.employer, roleSince: e.roleSince, sub: e.sub, organisations: e.organisations,
    })),
    positions: model.positions.map((p) => ({
      kind: p.kind, id: p.id, name: p.name, summary: p.summary, parts: p.parts, start: p.start, end: p.end,
      current: p.current, years: round(p.years),
      engagements: p.engagements.map((x) => ({
        name: x.name, via: x.via, title: x.title, experience: x.experience.id, start: x.start, end: x.end,
        current: x.current, missions: x.missions, missionParts: x.missionParts, parts: x.parts,
      })),
    })),
    milestones: model.milestones, achievements: model.achievements, projects: model.projects, skills: model.skills,
    education: model.education, certifications: model.certifications, awards: model.awards, interests: model.interests,
    careerYears: model.careerYears, archetype: model.archetype, theme: model.theme,
    sections: model.sections.map((s) => ({
      id: s.id, type: s.type, sourceType: s.sourceType, title: s.title, nav: s.nav, intro: s.intro, text: s.text,
      accent: s.accent, ground: s.ground, modes: s.modes, blocks: s.blocks.length,
    })),
    chapters: assigner
      .assign(model.sections.filter((s) => s.modes.includes('immersive')), model.theme)
      .map((s) => ({ id: s.id, accent: s.accent, ground: s.ground })),
  });

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(fixtures.now));
  });
  afterEach(() => vi.useRealTimers());

  for (const fixture of fixtures.cases) {
    it(`reads ${fixture.name} the same way`, () => {
      const adapted = TestBed.inject(CvAdapter).adapt(structuredClone(fixture.input));
      expect(adapted.format).toBe(fixture.format);
      expect(adapted.found).toEqual(fixture.found);

      TestBed.inject(Translator).use(fixture.lang);
      const localized = TestBed.inject(CvLocalizer).localize(adapted.data as Record<string, unknown>, fixture.lang);
      const model = TestBed.inject(CvNormalizer).normalize(localized);
      // Through JSON, as the fixture was: undefined fields and readonly wrappers do not count.
      expect(JSON.parse(JSON.stringify(project(model, TestBed.inject(ChapterInkAssigner))))).toEqual(fixture.expected);
    });
  }
});
