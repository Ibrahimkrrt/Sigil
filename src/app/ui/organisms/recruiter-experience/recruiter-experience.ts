import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { Translator } from '@core/i18n/translator';
import { CvExperience } from '@domain/models/cv-experience';
import { RecruiterItem } from '../../molecules/recruiter-item/recruiter-item';
import { RecruiterSection } from '../../molecules/recruiter-section/recruiter-section';
import { DateRangePipe } from '../../pipes/date-range.pipe';
import { PlainTextPipe } from '../../pipes/plain-text.pipe';
import { TranslatePipe } from '../../pipes/translate.pipe';

/** The work history, newest first as the CV lists it, with client missions nested under their employer. */
@Component({
  selector: 'sg-recruiter-experience',
  imports: [RecruiterSection, RecruiterItem, DateRangePipe, PlainTextPipe, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './recruiter-experience.html',
  styles: `
    :host { display: block; }
    p { margin: 0; }
    ul { margin: 0; padding-left: 1.25em; display: flex; flex-direction: column; gap: 4px; }
    sg-recruiter-item + sg-recruiter-item { margin-top: 12px; }
  `,
})
export class RecruiterExperience {
  readonly experience = input.required<readonly CvExperience[]>();

  private readonly translator = inject(Translator);

  /** Where the work was done, and through whom when it was a client mission. */
  protected meta(entry: CvExperience): string {
    const via = entry.employer ? this.translator.t('Client mission, via {name}', { name: entry.employer }) : '';
    return [via, entry.location].filter(Boolean).join(' · ');
  }

  protected heading(entry: CvExperience): string {
    return [entry.role, entry.company].filter(Boolean).join(', ');
  }
}
