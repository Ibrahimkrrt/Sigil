import { Injectable } from '@angular/core';
import { CvEngagement } from '@domain/models/cv-engagement';
import { CvExperience } from '@domain/models/cv-experience';
import { CvPosition } from '@domain/models/cv-position';
import { CvRoleDefinition } from '@domain/models/cv-role-definition';
import { CvRolePart } from '@domain/models/cv-role-part';
import { asList } from '@domain/read/as-list';
import { asText } from '@domain/read/as-text';
import { isRecord } from '@domain/read/is-record';
import { parseDate } from '@domain/text/parse-date';
import { slug } from '@domain/text/slug';

/**
 * Builds the positions of the journey. By default each experience entry is a position.
 * When the CV defines roles (a `roles` list, and role tags on entries or missions), the
 * positions are the roles instead: every company where a role was held is one of its
 * engagements, with the missions tagged with that role. A mission tagged with two roles
 * (full-stack work is front-end and back-end) appears under both.
 */
@Injectable({ providedIn: 'root' })
export class PositionBuilder {
  build(rawRoles: unknown, experience: readonly CvExperience[]): CvPosition[] {
    const tagged = experience.some((e) => e.roles.length || e.missionList.some((mission) => mission.roles?.length));
    if (!tagged) return experience.map((e) => this.entryPosition(e));

    const definitions = this.definitions(rawRoles);
    const partIds = new Set(definitions.flatMap((d) => d.parts.map((part) => part.id)));
    // Roles used but not declared are added in order of first appearance.
    for (const e of experience) {
      for (const id of [...e.roles, ...e.missionList.flatMap((mission) => mission.roles ?? [])]) {
        if (partIds.has(id) || definitions.some((d) => d.id === id)) continue;
        definitions.push({ id, name: id.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase()), summary: '', parts: [] });
      }
    }
    for (const e of experience) e.roleIds = [];
    return definitions
      .map((definition) => this.rolePosition(definition, experience))
      .filter((position): position is CvPosition => position !== null);
  }

  private entryPosition(e: CvExperience): CvPosition {
    return {
      kind: 'entry', id: e.id, name: e.company || e.role, summary: '', parts: [],
      start: e.start, end: e.end, current: e.current, years: this.span(e.start, e.end),
      engagements: [], experience: e, organisations: e.organisations,
    };
  }

  private rolePosition(definition: CvRoleDefinition, experience: readonly CvExperience[]): CvPosition | null {
    const engagements = experience
      .map((e) => this.engagement(definition, e))
      .filter((engagement): engagement is CvEngagement => engagement !== null);
    if (!engagements.length) return null;

    const dated = engagements
      .filter((engagement) => parseDate(engagement.start))
      .sort((a, b) => this.order(a.start) - this.order(b.start));
    const current = engagements.some((engagement) => engagement.current);
    const last = engagements
      .filter((engagement) => parseDate(engagement.end))
      .sort((a, b) => (parseDate(b.end)?.y ?? 0) - (parseDate(a.end)?.y ?? 0))[0];
    return {
      kind: 'role', id: definition.id, name: definition.name, summary: definition.summary,
      parts: definition.parts.map((part) => ({
        ...part,
        count: engagements.reduce((sum, engagement) => sum + (engagement.parts.find((own) => own.id === part.id)?.count ?? 0), 0),
      })),
      start: dated[0]?.start ?? '', end: current ? '' : (last?.end ?? ''), current,
      years: engagements.reduce((sum, engagement) => sum + this.span(engagement.start, engagement.end), 0),
      engagements, experience: null, organisations: [],
    };
  }

  private engagement(definition: CvRoleDefinition, e: CvExperience): CvEngagement | null {
    const ids = [definition.id, ...definition.parts.map((part) => part.id)];
    const mine = e.missionList.filter((mission) => (mission.roles ?? e.roles).some((id) => ids.includes(id)));
    const missions = mine.map((mission) => mission.text);
    // Which parts each mission belongs to; a mission tagged with the role itself counts for all of them.
    const missionParts = mine.map((mission) => {
      const roles = mission.roles ?? e.roles;
      const own = definition.parts.filter((part) => roles.includes(part.id)).map((part) => part.id);
      return own.length || !roles.includes(definition.id) ? own : definition.parts.map((part) => part.id);
    });
    const held = missions.length > 0 || (e.roles.some((id) => ids.includes(id)) && !e.missionList.length);
    if (!held) return null;
    e.roleIds.push(definition.id);
    const parts = definition.parts
      .map((part) => ({ id: part.id, name: part.name, count: missionParts.filter((own) => own.includes(part.id)).length }))
      .filter((part) => part.count > 0 || (!missions.length && e.roles.includes(part.id)));
    return {
      name: e.company || e.role, via: e.employer, title: e.role, experience: e,
      start: e.roleSince[definition.id] || e.start, end: e.end, current: e.current,
      missions, missionParts, parts,
    };
  }

  private definitions(rawRoles: unknown): CvRoleDefinition[] {
    return asList(rawRoles)
      .map((role) => (isRecord(role)
        ? { id: slug(role['id'] || role['name']), name: asText(role['name']) || asText(role['id']), summary: asText(role['summary']), parts: this.parts(role['parts']) }
        : { id: slug(role), name: asText(role), summary: '', parts: [] }))
      .filter((role) => role.name);
  }

  private parts(value: unknown): CvRolePart[] {
    return asList(value)
      .map((part) => (isRecord(part)
        ? { id: slug(part['id'] || part['name']), name: asText(part['name']) || asText(part['id']) }
        : { id: slug(part), name: asText(part) }))
      .filter((part) => part.name);
  }

  /** Length of a period in years, never shorter than a quarter. Half a year when it has no start. */
  private span(start: string, end: string): number {
    const from = parseDate(start);
    if (!from) return 0.5;
    const now = new Date();
    const to = parseDate(end) ?? { y: now.getFullYear(), m: now.getMonth() + 1 };
    return Math.max(0.25, to.y + ((to.m ?? 12) - 1) / 12 - (from.y + ((from.m ?? 1) - 1) / 12));
  }

  private order(date: string): number {
    const parsed = parseDate(date);
    return parsed ? parsed.y * 12 + (parsed.m ?? 1) : 0;
  }
}
