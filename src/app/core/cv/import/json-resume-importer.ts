import { Injectable, inject } from '@angular/core';
import { LooseRecord } from '@domain/models/loose-record';
import { isRecord } from '@domain/read/is-record';
import { FieldPicker } from './field-picker';
import { LooseDateReader } from './loose-date-reader';
import { LooseTextReader } from './loose-text-reader';

/** Converts the JSON Resume standard (basics, work, education, skills…) to the engine's format. */
@Injectable({ providedIn: 'root' })
export class JsonResumeImporter {
  private readonly picker = inject(FieldPicker);
  private readonly dates = inject(LooseDateReader);
  private readonly text = inject(LooseTextReader);

  import(resume: LooseRecord): LooseRecord {
    const { str, clean } = this.bound();
    const text = this.text;
    const basics = isRecord(resume['basics']) ? resume['basics'] : {};
    const references = text.records(resume['references']);
    const name = str(basics['name']);
    const out: LooseRecord = {
      meta: clean({ lang: str(this.picker.pick(resume['meta'], 'lang', 'language')) }),
      profile: clean({
        name, headline: str(basics['label']), location: text.place(basics['location']), summary: text.paragraphs(basics['summary']),
        photo: str(basics['image']) ? { src: str(basics['image']), alt: name ? `Portrait of ${name}` : 'Portrait' } : null,
        quote: references[0] && str(references[0]['reference'])
          ? clean({ text: str(references[0]['reference']), cite: str(references[0]['name']) })
          : null,
      }),
      contact: clean({
        email: str(basics['email']), phone: str(basics['phone']), website: str(basics['url'] || basics['website']),
        links: text.records(basics['profiles'])
          .map((profile) => ({ label: str(profile['network']) || str(profile['username']), url: str(profile['url']) }))
          .filter((link) => link.label && link.url),
      }),
      experience: [...text.records(resume['work']), ...text.records(resume['volunteer'])].map((work) => clean({
        role: str(work['position'] || work['title']),
        company: str(work['name'] || work['company'] || work['organization']),
        location: text.place(work['location']),
        ...this.dates.period(work),
        summary: str(work['summary'] || work['description']),
        highlights: text.lines(work['highlights']),
        tags: text.names(work['keywords']),
      })),
      education: text.records(resume['education']).map((education) => clean({
        school: str(education['institution']),
        degree: [str(education['studyType']), str(education['area'])].filter(Boolean).join(', '),
        start: this.dates.date(education['startDate']),
        end: this.dates.date(education['endDate']),
        detail: [str(education['score']) ? `Score: ${str(education['score'])}` : '', text.names(education['courses']).join(', ')].filter(Boolean).join('. '),
      })),
      certifications: text.records(resume['certificates'])
        .map((certificate) => clean({ title: str(certificate['name']), issuer: str(certificate['issuer']), year: this.dates.year(certificate['date']) })),
      awards: text.records(resume['awards'])
        .map((award) => clean({ title: str(award['title']), issuer: str(award['awarder']), year: this.dates.year(award['date']) })),
      projects: text.records(resume['projects']).map((project) => clean({
        title: str(project['name']),
        role: text.names(project['roles']).join(', '),
        year: this.dates.year(project['endDate'] || project['startDate']),
        summary: str(project['description']),
        outcome: text.lines(project['highlights']).join(' '),
        tags: text.names(project['keywords']),
        link: str(project['url']) ? { label: 'Visit', url: str(project['url']) } : null,
      })),
      skills: clean({
        // In JSON Resume a "skill" is usually a group with keywords; without keywords it is the skill itself.
        technical: text.records(resume['skills'])
          .flatMap((skill): LooseRecord[] => (text.names(skill['keywords']).length
            ? text.names(skill['keywords']).map((keyword) => ({ name: keyword, group: str(skill['name']) }))
            : [clean({ name: str(skill['name']), level: text.level(skill['level']) })]))
          .filter((skill) => skill['name']),
        languages: text.records(resume['languages'])
          .map((language) => clean({ name: str(language['language']), level: str(language['fluency']) }))
          .filter((language) => language['name']),
      }),
      interests: text.list(resume['interests'])
        .map((interest) => (isRecord(interest) ? str(interest['name']) : str(interest)))
        .filter(Boolean),
    };
    const publications = text.records(resume['publications']).filter((publication) => str(publication['name']));
    if (publications.length) {
      out['customSections'] = [{
        id: 'publications', title: 'Publications', nav: 'Publications',
        blocks: [{
          type: 'links',
          items: publications.map((publication) => clean({
            label: [str(publication['name']), str(publication['publisher']), this.dates.year(publication['releaseDate'])].filter(Boolean).join(' · '),
            url: str(publication['url']),
          })),
        }],
      }];
    }
    return clean(out);
  }

  private bound(): { str: (value: unknown) => string; clean: <T extends LooseRecord>(record: T) => T } {
    return { str: (value) => this.text.str(value), clean: (record) => this.text.clean(record) };
  }
}
