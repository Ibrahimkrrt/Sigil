import { Injectable } from '@angular/core';
import { Archetype } from '@domain/models/archetype';
import { CvExperience } from '@domain/models/cv-experience';
import { CvProject } from '@domain/models/cv-project';
import { CvSkills } from '@domain/models/cv-skills';

/** Guesses what kind of professional a CV describes, to choose the order of its chapters. */
@Injectable({ providedIn: 'root' })
export class ArchetypeDetector {
  detect(headline: string, experience: readonly CvExperience[], projects: readonly CvProject[], skills: CvSkills): Archetype {
    const text = `${headline} ${experience.slice(0, 2).map((e) => e.role).join(' ')}`.toLowerCase();
    const score: Record<Exclude<Archetype, 'generalist'>, number> = { designer: 0, engineer: 0, manager: 0, consultant: 0 };
    if (/consult|advis|freelance|partner|interim/.test(text)) score.consultant += 3;
    if (/director|head of|vp|vice president|chief|manager|lead\b|leader/.test(text)) score.manager += 3;
    if (/design|art director|creative|ux|ui\b|illustrat|brand/.test(text)) score.designer += 2;
    if (/engineer|developer|architect|programmer|devops|sre|data scien|software/.test(text)) score.engineer += 2;
    if (experience.some((e) => e.clients.length)) score.consultant += 2;
    if (experience.some((e) => e.team)) score.manager += 1;
    if (projects.filter((p) => p.image || p.gallery.length).length >= 2) score.designer += 1;
    if (skills.technical.length >= 8) score.engineer += 1;
    const [best, points] = (Object.entries(score) as [Exclude<Archetype, 'generalist'>, number][]).sort((a, b) => b[1] - a[1])[0];
    return points > 0 ? best : 'generalist';
  }
}
