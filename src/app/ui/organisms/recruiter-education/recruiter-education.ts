import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { DateFormatter } from '@core/format/date-formatter';
import { CvEducation } from '@domain/models/cv-education';
import { RecruiterSection } from '../../molecules/recruiter-section/recruiter-section';
import { TranslatePipe } from '../../pipes/translate.pipe';

/** Degrees and schools, with their years. */
@Component({
  selector: 'sg-recruiter-education',
  imports: [RecruiterSection, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <sg-recruiter-section id="education" [heading]="'Education' | t">
      @for (entry of education(); track $index) {
        <p>
          <strong>{{ entry.degree || entry.school }}</strong>
          @if (entry.degree && entry.school) {
            <br />{{ entry.school }}
          }
          @if (when(entry); as years) {
            <br /><span class="meta">{{ years }}</span>
          }
        </p>
      }
    </sg-recruiter-section>
  `,
  styles: `
    :host { display: block; }
    p { margin: 0; }
    .meta { color: #4a4a48; }
  `,
})
export class RecruiterEducation {
  private readonly dates = inject(DateFormatter);
  readonly education = input.required<readonly CvEducation[]>();

  protected when(entry: CvEducation): string {
    return this.dates.range(entry.start, entry.end, false, '') || entry.end;
  }
}
