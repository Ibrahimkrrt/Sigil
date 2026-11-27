import { Injectable, inject } from '@angular/core';
import { CvModel } from '@domain/models/cv-model';
import { Translator } from '../i18n/translator';

/** The in-page links of the recruiter document: its main parts, in reading order. */
@Injectable({ providedIn: 'root' })
export class RecruiterOutline {
  private readonly translator = inject(Translator);

  links(model: CvModel): { id: string; label: string }[] {
    const t = (source: string): string => this.translator.t(source);
    const parts: [boolean, string, string][] = [
      [model.profile.summary.length > 0, 'summary', t('Summary')],
      [model.experience.length > 0, 'experience', t('Experience')],
      [model.achievements.length > 0, 'achievements', t('Achievements')],
      [model.projects.length > 0, 'projects', t('Projects')],
      [model.skills.technical.length + model.skills.soft.length > 0, 'skills', t('Skills')],
      [model.education.length > 0, 'education', t('Education')],
    ];
    return parts.filter(([present]) => present).map(([, id, label]) => ({ id: `rec-${id}`, label }));
  }
}
