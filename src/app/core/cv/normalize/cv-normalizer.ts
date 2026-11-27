import { Injectable, inject } from '@angular/core';
import { Archetype } from '@domain/models/archetype';
import { CvContact } from '@domain/models/cv-contact';
import { CvContent } from '@domain/models/cv-content';
import { CvCredential } from '@domain/models/cv-credential';
import { CvModel } from '@domain/models/cv-model';
import { CvProfile } from '@domain/models/cv-profile';
import { CvProject } from '@domain/models/cv-project';
import { CvSkills } from '@domain/models/cv-skills';
import { LooseRecord } from '@domain/models/loose-record';
import { asList } from '@domain/read/as-list';
import { asNumber } from '@domain/read/as-number';
import { asRecord } from '@domain/read/as-record';
import { asText } from '@domain/read/as-text';
import { isRecord } from '@domain/read/is-record';
import { clamp } from '@domain/math/clamp';
import { initials } from '@domain/text/initials';
import { parseDate } from '@domain/text/parse-date';
import { slug } from '@domain/text/slug';
import { Translator } from '../../i18n/translator';
import { ARCHETYPES } from './archetypes';
import { ArchetypeDetector } from './archetype-detector';
import { ExperienceReader } from './experience-reader';
import { FieldReader } from './field-reader';
import { PositionBuilder } from './position-builder';
import { SectionResolver } from './section-resolver';
import { ThemeResolver } from './theme-resolver';

/**
 * The content layer: turns a CV file into a complete, predictable model.
 * Missing data becomes empty values, never errors.
 */
@Injectable({ providedIn: 'root' })
export class CvNormalizer {
  private readonly translator = inject(Translator);
  private readonly fields = inject(FieldReader);
  private readonly experienceReader = inject(ExperienceReader);
  private readonly positionBuilder = inject(PositionBuilder);
  private readonly archetypeDetector = inject(ArchetypeDetector);
  private readonly themeResolver = inject(ThemeResolver);
  private readonly sectionResolver = inject(SectionResolver);

  normalize(input: unknown, includeHidden = false): CvModel {
    const raw = asRecord(input);
    const meta = asRecord(raw['meta']);
    const rawProfile = asRecord(raw['profile']);
    const profile = this.profile(rawProfile);
    const contact = this.contact(raw);
    const experience = this.experienceReader.read(raw['experience']);
    const projects = this.projects(raw['projects']);
    const skills = this.skills(raw);
    const positions = this.positionBuilder.build(raw['roles'], experience);

    // A client mission delivered through an employer that has its own entry is shown nested under it.
    for (const entry of experience) entry.sub = !!entry.employer && experience.some((other) => other !== entry && other.company === entry.employer);

    const starts = experience.map((entry) => parseDate(entry.start)?.y).filter((year): year is number => year != null);
    const declared = ARCHETYPES.find((archetype): archetype is Archetype => archetype === rawProfile['archetype']);
    const content: CvContent = {
      raw,
      meta: {
        lang: asText(meta['lang']) || 'en',
        demo: meta['demo'] === true,
        demoNotice: asText(meta['demoNotice']) || (meta['demo'] === true ? this.translator.t('Demonstration profile. All content is fictional.') : ''),
        title: asText(meta['title']),
        description: asText(meta['description']),
      },
      profile, contact, experience, projects, skills, positions,
      milestones: asList(raw['milestones'])
        .map((item) => asRecord(item))
        .map((item) => ({ date: asText(item['date']), title: asText(item['title']), text: asText(item['text']) }))
        .filter((milestone) => milestone.title),
      achievements: this.fields.stats(raw['achievements']),
      education: asList(raw['education'])
        .map((item) => asRecord(item))
        .map((item) => ({
          degree: asText(item['degree']) || asText(item['title']),
          school: asText(item['school']) || asText(item['institution']),
          start: asText(item['start']),
          end: asText(item['end']) || asText(item['year']),
          detail: asText(item['detail']),
        }))
        .filter((education) => education.degree || education.school),
      certifications: this.credentials(raw['certifications']),
      awards: this.credentials(raw['awards']),
      interests: asList(raw['interests'])
        .map((item) => asText(isRecord(item) ? item['name'] || item['title'] : item))
        .filter(Boolean),
      careerYears: starts.length ? Math.max(0, new Date().getFullYear() - Math.min(...starts)) : 0,
      archetype: declared ?? this.archetypeDetector.detect(profile.headline, experience, projects, skills),
      theme: this.themeResolver.resolve(raw['theme'], profile.name, contact.email),
    };
    return { ...content, sections: this.sectionResolver.resolve(content, includeHidden) };
  }

  private profile(p: LooseRecord): CvProfile {
    const name = asText(p['name']) || [asText(p['givenName']), asText(p['familyName'])].filter(Boolean).join(' ') || this.translator.t('Your Name');
    const words = name.split(/\s+/);
    const quote = typeof p['quote'] === 'string' ? { text: p['quote'] } : asRecord(p['quote']);
    return {
      name,
      given: asText(p['givenName']) || (words.length > 1 ? words.slice(0, -1).join(' ') : words[0]),
      family: asText(p['familyName']) || (words.length > 1 ? words[words.length - 1] : ''),
      initials: initials(name),
      headline: asText(p['headline']),
      tagline: asText(p['tagline']),
      location: asText(p['location']),
      summary: this.fields.texts(p['summary']),
      facts: asList(p['facts'])
        .map((fact) => asRecord(fact))
        .map((fact) => ({ label: asText(fact['label']), value: asText(fact['value']) }))
        .filter((fact) => fact.value),
      quote: asText(quote['text']) ? { text: asText(quote['text']), cite: asText(quote['cite']) } : null,
      photo: this.fields.image(p['photo']),
      photos: this.fields.images(p['photos']),
    };
  }

  private contact(raw: LooseRecord): CvContact {
    const c = asRecord(raw['contact']);
    return {
      email: asText(c['email']), phone: asText(c['phone']), website: asText(c['website']), address: asText(c['address']),
      links: this.fields.links(c['links'] || raw['social']),
    };
  }

  private projects(value: unknown): CvProject[] {
    return asList(value)
      .map((item) => asRecord(item))
      .map((x, index) => ({
        id: slug(x['id'] || x['title'], `project-${index + 1}`),
        title: asText(x['title']), role: asText(x['role']), year: asText(x['year']),
        summary: asText(x['summary']), outcome: asText(x['outcome']),
        image: this.fields.image(x['image']),
        gallery: this.fields.images(x['gallery']),
        stats: this.fields.stats(x['stats']),
        tags: this.fields.texts(x['tags']),
        process: asList(x['process'])
          .map((step) => asRecord(step))
          .map((step) => ({ title: asText(step['title']), text: asText(step['text']) }))
          .filter((step) => step.title || step.text),
        link: this.fields.link(x['link']),
      }))
      .filter((project) => project.title);
  }

  private skills(raw: LooseRecord): CvSkills {
    const skills = Array.isArray(raw['skills']) ? { technical: raw['skills'] } : asRecord(raw['skills']);
    return {
      technical: asList(skills['technical'])
        .map((skill) => (isRecord(skill)
          ? { name: asText(skill['name']), level: asNumber(skill['level']), group: asText(skill['group']) }
          : { name: asText(skill), level: null, group: '' }))
        .filter((skill) => skill.name)
        .map((skill) => ({ ...skill, level: skill.level == null ? null : clamp(skill.level, 0, 100) })),
      soft: asList(skills['soft']).map((skill) => asText(isRecord(skill) ? skill['name'] : skill)).filter(Boolean),
      languages: asList(skills['languages'] || raw['languages'])
        .map((language) => (isRecord(language)
          ? { name: asText(language['name']), level: asText(language['level']), score: asNumber(language['score']) }
          : { name: asText(language), level: '', score: null }))
        .filter((language) => language.name),
    };
  }

  private credentials(value: unknown): CvCredential[] {
    return asList(value)
      .map((item) => (isRecord(item)
        ? { title: asText(item['title']) || asText(item['name']), issuer: asText(item['issuer']), year: asText(item['year']) }
        : { title: asText(item), issuer: '', year: '' }))
      .filter((credential) => credential.title);
  }
}
