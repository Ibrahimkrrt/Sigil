import { ChangeDetectionStrategy, Component, booleanAttribute, input } from '@angular/core';
import { RecruiterSection } from '../../molecules/recruiter-section/recruiter-section';

/** A titled list of short lines (certifications, awards) or one line of text (languages, interests). */
@Component({
  selector: 'sg-recruiter-list',
  imports: [RecruiterSection],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <sg-recruiter-section [id]="id()" [heading]="heading()">
      @if (inline()) {
        <p>{{ lines().join(', ') }}</p>
      } @else {
        <ul>
          @for (line of lines(); track $index) {
            <li>{{ line }}</li>
          }
        </ul>
      }
    </sg-recruiter-section>
  `,
  styles: `
    :host { display: block; }
    p { margin: 0; }
    ul { margin: 0; padding-left: 1.25em; display: flex; flex-direction: column; gap: 4px; }
  `,
})
export class RecruiterList {
  readonly id = input.required<string>();
  readonly heading = input.required<string>();
  readonly lines = input.required<readonly string[]>();
  /** Set the lines as one comma-separated sentence instead of a list. */
  readonly inline = input(false, { transform: booleanAttribute });
}
