import { Injectable, inject } from '@angular/core';
import { CvCompany } from '@domain/models/cv-company';
import { CvExperience } from '@domain/models/cv-experience';
import { CvMission } from '@domain/models/cv-mission';
import { asList } from '@domain/read/as-list';
import { asNumber } from '@domain/read/as-number';
import { asRecord } from '@domain/read/as-record';
import { asText } from '@domain/read/as-text';
import { isRecord } from '@domain/read/is-record';
import { slug } from '@domain/text/slug';
import { FieldReader } from './field-reader';

/** Reads the `experience` list of a CV file. */
@Injectable({ providedIn: 'root' })
export class ExperienceReader {
  private readonly fields = inject(FieldReader);

  read(value: unknown): CvExperience[] {
    return asList(value)
      .map((item, index) => this.entry(asRecord(item), index))
      .filter((entry) => entry.role || entry.company)
      .map((entry) => this.withOrganisations(entry));
  }

  private entry(e: Record<string, unknown>, index: number): CvExperience {
    const end = asText(e['end']);
    const missionList = this.missions(e['missions'] || e['highlights']);
    const roles = asList(e['roles']).map((role) => slug(role));
    return {
      id: slug(e['id'] || `${asText(e['company'])}-${asText(e['role'])}`, `role-${index + 1}`),
      role: asText(e['role']) || asText(e['title']),
      company: asText(e['company']) || asText(e['organisation']) || asText(e['client']),
      location: asText(e['location']),
      start: asText(e['start']),
      end,
      current: !end || /present|today|now|current/i.test(end),
      summary: asText(e['summary']),
      stats: this.fields.stats(e['stats']),
      missionList,
      roles,
      tags: this.fields.texts(e['tags']),
      team: asNumber(e['team']),
      employer: asText(e['employer'] || e['via']),
      roleSince: Object.fromEntries(
        Object.entries(asRecord(e['roleSince'])).map(([role, since]) => [slug(role), asText(since)] as const).filter(([, since]) => since),
      ),
      clients: this.fields.texts(e['clients']),
      companies: this.companies(e['companies']),
      highlights: missionList.map((mission) => mission.text),
      roleIds: [...new Set([...roles, ...missionList.flatMap((mission) => mission.roles ?? [])])],
      organisations: [],
      sub: false,
    };
  }

  /** A mission is a line of text, optionally tagged with the roles it was carried out in. */
  private missions(value: unknown): CvMission[] {
    return asList(value)
      .map((item) => (isRecord(item)
        ? { text: asText(item['text']), roles: asList(item['roles'] || item['role']).map((role) => slug(role)) }
        : { text: asText(item), roles: null }))
      .filter((mission) => mission.text);
  }

  private companies(value: unknown): CvCompany[] {
    return asList(value)
      .map((item) => (isRecord(item)
        ? { name: asText(item['name']), missions: this.fields.texts(item['missions'] || item['highlights']) }
        : { name: asText(item), missions: [] }))
      .filter((company) => company.name);
  }

  /** The organisations an entry covers. Several companies or clients mean several organisations. */
  private withOrganisations(entry: CvExperience): CvExperience {
    const named: readonly CvCompany[] = entry.companies.length
      ? entry.companies
      : entry.clients.length > 1
        ? entry.clients.map((name) => ({ name, missions: [] }))
        : [{ name: entry.company, missions: [] }];
    if (!entry.company && entry.companies.length) entry.company = entry.companies.map((company) => company.name).join(', ');
    const ownMissions = named.some((company) => company.missions.length);
    if (ownMissions) entry.highlights = [...entry.highlights, ...named.flatMap((company) => company.missions)];
    // Missions listed on the entry itself are shared out across its organisations.
    entry.organisations = named.map((company, j) => ({
      name: company.name,
      missionCount: ownMissions ? company.missions.length : entry.highlights.filter((_, k) => k % named.length === j).length,
    }));
    return entry;
  }
}
