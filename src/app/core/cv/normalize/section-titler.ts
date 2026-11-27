import { Injectable, inject } from '@angular/core';
import { CvContent } from '@domain/models/cv-content';
import { Translator } from '../../i18n/translator';

/** Writes the title a built-in chapter gets when the CV does not give one. */
@Injectable({ providedIn: 'root' })
export class SectionTitler {
  private readonly translator = inject(Translator);

  title(type: string, cv: CvContent): string {
    const t = (source: string, vars?: Record<string, string>) => this.translator.t(source, vars);
    switch (type) {
      case 'summary': return t('The short *version*');
      case 'experience': return cv.archetype === 'consultant' ? t('Missions and *mandates*') : this.journey(cv);
      case 'roles': return t('Roles *taken*');
      case 'milestones': return t('Turning *points*');
      case 'achievements': return cv.archetype === 'manager' ? t('Leadership, measured in *what changed*') : t('Measured in *what changed*');
      case 'projects': return cv.archetype === 'consultant' ? t('Selected *engagements*') : t('Selected *work*');
      case 'skills': return cv.archetype === 'engineer' ? t('The *stack*, and the craft around it') : t('The *toolkit*');
      case 'education': return t('Foundations and *credentials*');
      case 'awards': return t('Recognised *by peers*');
      case 'interests': return t('Off the *clock*');
      case 'contact': return t('Start a *conversation*');
      default: return '';
    }
  }

  /** "Eight years, four positions". With roles in the CV the positions are the roles. */
  private journey(cv: CvContent): string {
    if (cv.careerYears < 2) return this.translator.t('The *journey* so far');
    const count = cv.positions.filter((position) => position.kind === 'role').length || cv.experience.length;
    return this.translator.t('{years} years, *{count} {positions}*', {
      years: this.translator.numberWord(cv.careerYears),
      count: this.translator.numberWord(count).toLowerCase(),
      positions: this.translator.t(count === 1 ? 'position' : 'positions'),
    });
  }
}
