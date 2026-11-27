import { Injectable, inject } from '@angular/core';
import { LooseRecord } from '@domain/models/loose-record';
import { isRecord } from '@domain/read/is-record';
import { FieldPicker } from './field-picker';
import { LooseDateReader } from './loose-date-reader';
import { LooseTextReader } from './loose-text-reader';

/**
 * Converts any other CV file by matching its keys by meaning: experience, jobs,
 * employment and workExperience all mean the same thing. Nothing is invented:
 * a field that cannot be recognised is left out.
 */
@Injectable({ providedIn: 'root' })
export class GenericCvImporter {
  private readonly picker = inject(FieldPicker);
  private readonly dates = inject(LooseDateReader);
  private readonly text = inject(LooseTextReader);
  private readonly socialNetworks: readonly (readonly [string, readonly string[]])[] = [
    ['LinkedIn', ['linkedin', 'linkedinurl']], ['GitHub', ['github', 'githuburl']], ['GitLab', ['gitlab']],
    ['X', ['twitter', 'x']], ['Portfolio', ['portfolio']], ['Blog', ['blog']],
  ];

  import(file: LooseRecord): LooseRecord {
    const text = this.text;
    const str = (value: unknown): string => text.str(value);
    const pick = (source: unknown, ...names: string[]): unknown => this.picker.pick(source, ...names);

    // Where the person is described: a nested object under one of many names, or the file itself.
    const who = [pick(file, 'personal', 'personalinfo', 'personalinformation', 'personaldetails', 'basics', 'about', 'header', 'info', 'candidate', 'person', 'profile', 'contact', 'contactinfo'), file].find(isRecord) ?? file;
    const from = (...names: string[]): unknown => pick(who, ...names) ?? pick(file, ...names);
    const contactSource = [pick(file, 'contact', 'contactinfo', 'contacts', 'contactdetails'), who].find(isRecord) ?? {};
    const contact = (...names: string[]): unknown => pick(contactSource, ...names) ?? from(...names);

    const name = str(from('name', 'fullname', 'displayname'))
      || [from('firstname', 'givenname', 'first'), from('lastname', 'familyname', 'surname', 'last')].map(str).filter(Boolean).join(' ');
    const about = [
      from('summary', 'about', 'aboutme', 'bio', 'biography', 'objective', 'description', 'overview', 'profilesummary'),
      typeof file['profile'] === 'string' ? file['profile'] : null,
      typeof file['about'] === 'string' ? file['about'] : null,
    ].find((value) => typeof value === 'string' || Array.isArray(value));
    const photo = str(from('photo', 'image', 'picture', 'avatar', 'photourl', 'imageurl'));
    const rawSkills = pick(file, 'skills', 'skill', 'competences', 'competencies', 'technologies', 'technicalskills', 'hardskills', 'expertise', 'stack', 'tools');
    const skills = this.skills(file, rawSkills);

    return text.clean({
      meta: text.clean({ lang: str(pick(file, 'lang', 'language', 'locale')).slice(0, 2).toLowerCase() }),
      profile: text.clean({
        name,
        headline: str(from('headline', 'title', 'jobtitle', 'label', 'role', 'position', 'occupation', 'profession', 'tagline')),
        location: text.place(contact('location', 'address', 'city', 'place', 'basedin')),
        summary: text.paragraphs(about),
        photo: photo ? { src: photo, alt: name ? `Portrait of ${name}` : 'Portrait' } : null,
      }),
      contact: text.clean({
        email: str(contact('email', 'mail', 'emailaddress')),
        phone: str(contact('phone', 'telephone', 'mobile', 'phonenumber', 'tel')),
        website: str(contact('website', 'url', 'web', 'site', 'homepage')),
        links: this.socialLinks(contact),
      }),
      experience: this.experience(file),
      education: this.education(file),
      certifications: text.list(pick(file, 'certifications', 'certificates', 'certification', 'licenses', 'courses', 'training'))
        .map((item) => (isRecord(item)
          ? this.credential(item, ['title', 'name', 'certification', 'certificate'], ['issuer', 'authority', 'organization', 'provider', 'institution', 'by'], ['year', 'date', 'issued', 'issuedate'])
          : { title: str(item) }))
        .filter((item) => item['title']),
      awards: text.list(pick(file, 'awards', 'honors', 'honours', 'achievements', 'distinctions', 'recognition'))
        .map((item) => (isRecord(item)
          ? this.credential(item, ['title', 'name', 'award'], ['issuer', 'awarder', 'organization', 'by'], ['year', 'date'])
          : { title: str(item) }))
        .filter((item) => item['title']),
      projects: this.projects(file),
      skills,
      interests: text.names(pick(file, 'interests', 'hobbies', 'passions', 'activities', 'centresdinteret')),
    });
  }

  private socialLinks(contact: (...names: string[]) => unknown): LooseRecord[] {
    const links: LooseRecord[] = [];
    for (const [label, keys] of this.socialNetworks) {
      const value = this.text.str(contact(...keys));
      if (value) links.push({ label, url: /^https?:\/\//.test(value) ? value : `https://${value.replace(/^\/+/, '')}` });
    }
    for (const link of this.text.records(contact('links', 'profiles', 'social', 'socials', 'sociallinks', 'websites'))) {
      const url = this.text.str(this.picker.pick(link, 'url', 'link', 'href'));
      const label = this.text.str(this.picker.pick(link, 'label', 'network', 'name', 'title', 'type'));
      if (url && label) links.push({ label, url });
    }
    return links;
  }

  private experience(file: LooseRecord): LooseRecord[] {
    const text = this.text;
    const str = (value: unknown): string => text.str(value);
    const pick = (source: unknown, ...names: string[]): unknown => this.picker.pick(source, ...names);
    const jobs = text.records(pick(file, 'experience', 'experiences', 'work', 'workexperience', 'workhistory', 'employment', 'employmenthistory', 'jobs', 'positions', 'career', 'professionalexperience', 'history'));
    return jobs
      .map((job) => {
        const description = pick(job, 'description', 'summary', 'details', 'overview');
        const bullets = pick(job, 'highlights', 'achievements', 'responsibilities', 'bullets', 'tasks', 'missions', 'accomplishments', 'duties', 'points');
        const company = pick(job, 'company', 'employer', 'organization', 'organisation', 'companyname', 'org', 'client');
        const hasRole = pick(job, 'role', 'title', 'position', 'jobtitle');
        const oneLine = typeof description === 'string' && !/\n\s*[-•*·]/.test(description) && text.lines(description).length <= 1;
        return text.clean({
          role: str(pick(job, 'role', 'title', 'position', 'jobtitle', 'job')),
          company: isRecord(company) ? str(pick(company, 'name')) : str(company) || (hasRole ? str(pick(job, 'name')) : ''),
          location: text.place(pick(job, 'location', 'city', 'place')),
          ...this.dates.period(job),
          summary: (bullets != null && typeof description === 'string') || oneLine ? str(description) : '',
          highlights: bullets != null ? text.lines(bullets) : Array.isArray(description) || /\n/.test(str(description)) ? text.lines(description) : [],
          tags: text.names(pick(job, 'technologies', 'tech', 'stack', 'techstack', 'tools', 'skills', 'keywords', 'tags')),
        });
      })
      .filter((entry) => entry['role'] || entry['company']);
  }

  private education(file: LooseRecord): LooseRecord[] {
    const str = (value: unknown): string => this.text.str(value);
    const pick = (source: unknown, ...names: string[]): unknown => this.picker.pick(source, ...names);
    return this.text.records(pick(file, 'education', 'educations', 'studies', 'academics', 'academic', 'schools', 'formation', 'formations', 'degrees'))
      .map((entry) => {
        const period = this.dates.period(entry);
        const graduation = pick(entry, 'year', 'graduation', 'graduationyear', 'graduated');
        return this.text.clean({
          school: str(pick(entry, 'school', 'institution', 'university', 'college', 'establishment', 'name', 'organization')),
          degree: [
            str(pick(entry, 'degree', 'studytype', 'qualification', 'diploma', 'title', 'level')),
            str(pick(entry, 'field', 'area', 'major', 'fieldofstudy', 'subject', 'specialization', 'speciality')),
          ].filter(Boolean).join(', '),
          start: period.start,
          end: period.end || (str(graduation) ? this.dates.date(graduation) : ''),
          detail: str(pick(entry, 'detail', 'details', 'description', 'grade', 'gpa', 'honors', 'notes')),
        });
      })
      .filter((entry) => entry['school'] || entry['degree']);
  }

  /** Skills come as strings, as { name, level }, as groups with items, or as an object of groups. */
  private skills(file: LooseRecord, rawSkills: unknown): LooseRecord {
    const text = this.text;
    const str = (value: unknown): string => text.str(value);
    const pick = (source: unknown, ...names: string[]): unknown => this.picker.pick(source, ...names);
    const technical: LooseRecord[] = [];
    const soft: string[] = [];
    const add = (skill: unknown, group = ''): void => {
      if (!isRecord(skill)) {
        for (const name of str(skill).split(/\s*[,;|]\s*/).filter(Boolean)) technical.push(text.clean({ name, group }));
        return;
      }
      const items = pick(skill, 'keywords', 'items', 'skills', 'list', 'values', 'technologies');
      const name = str(pick(skill, 'name', 'skill', 'title', 'label', 'category', 'group'));
      if (items != null) for (const item of text.list(items)) add(item, name);
      else if (name) technical.push(text.clean({ name, group, level: text.level(pick(skill, 'level', 'rating', 'proficiency', 'score', 'value')) }));
    };
    if (isRecord(rawSkills)) {
      for (const [group, value] of Object.entries(rawSkills)) {
        if (/soft|personal|interpersonal/i.test(group)) soft.push(...text.names(value));
        else if (/lang/i.test(group) && !/program/i.test(group)) continue;
        else for (const item of text.list(value)) add(item, group.replace(/[_-]+/g, ' ').replace(/^./, (c) => c.toUpperCase()));
      }
    } else {
      for (const item of text.list(rawSkills)) add(item);
    }
    soft.push(...text.names(pick(file, 'softskills', 'personalskills', 'strengths')));

    const spoken = pick(file, 'languages', 'language', 'spokenlanguages', 'langues') ?? (isRecord(rawSkills) ? pick(rawSkills, 'languages', 'spokenlanguages') : null);
    const languages = text.list(spoken)
      .map((language): LooseRecord => (isRecord(language)
        ? { name: str(pick(language, 'language', 'name', 'title')), level: str(pick(language, 'fluency', 'level', 'proficiency')) }
        // "French (fluent)" or "French: fluent" as one string.
        : { name: str(language).replace(/\s*[(:–-]\s*.*$/, ''), level: /[(:–-]\s*(.*?)\)?$/.exec(str(language))?.[1] ?? '' }))
      .map((language) => text.clean(language))
      .filter((language) => language['name']);
    return text.clean({ technical, soft: [...new Set(soft)], languages });
  }

  private projects(file: LooseRecord): LooseRecord[] {
    const text = this.text;
    const str = (value: unknown): string => text.str(value);
    const pick = (source: unknown, ...names: string[]): unknown => this.picker.pick(source, ...names);
    return text.records(pick(file, 'projects', 'portfolio', 'work_samples', 'casestudies', 'sideprojects', 'opensource'))
      .map((project) => {
        const description = pick(project, 'description', 'summary');
        const url = str(pick(project, 'url', 'link', 'website', 'repo', 'repository', 'github'));
        return text.clean({
          title: str(pick(project, 'title', 'name', 'project')),
          role: text.names(pick(project, 'role', 'roles')).join(', '),
          year: this.dates.year(pick(project, 'year', 'date', 'enddate', 'startdate')),
          summary: typeof description === 'string' ? str(description) : text.lines(description).join(' '),
          outcome: text.lines(pick(project, 'highlights', 'outcome', 'result', 'results', 'impact')).join(' '),
          tags: text.names(pick(project, 'technologies', 'tech', 'stack', 'keywords', 'tags', 'tools')),
          link: url ? { label: 'Visit', url } : null,
        });
      })
      .filter((project) => project['title']);
  }

  private credential(item: LooseRecord, titleKeys: string[], issuerKeys: string[], yearKeys: string[]): LooseRecord {
    return this.text.clean({
      title: this.text.str(this.picker.pick(item, ...titleKeys)),
      issuer: this.text.str(this.picker.pick(item, ...issuerKeys)),
      year: this.dates.year(this.picker.pick(item, ...yearKeys)),
    });
  }
}
