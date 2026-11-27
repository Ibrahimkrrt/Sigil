import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CvStat } from '@domain/models/cv-stat';
import { RecruiterSection } from '../../molecules/recruiter-section/recruiter-section';
import { PlainTextPipe } from '../../pipes/plain-text.pipe';
import { TranslatePipe } from '../../pipes/translate.pipe';

/** The headline figures, as a plain list. */
@Component({
  selector: 'sg-recruiter-achievements',
  imports: [RecruiterSection, PlainTextPipe, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <sg-recruiter-section id="achievements" [heading]="'Key achievements' | t">
      <ul>
        @for (stat of achievements(); track $index) {
          <li><strong>{{ stat.value }}</strong> {{ stat.label | plain }}</li>
        }
      </ul>
    </sg-recruiter-section>
  `,
  styles: `
    :host { display: block; }
    ul { margin: 0; padding-left: 1.25em; display: flex; flex-direction: column; gap: 4px; }
  `,
})
export class RecruiterAchievements {
  readonly achievements = input.required<readonly CvStat[]>();
}
