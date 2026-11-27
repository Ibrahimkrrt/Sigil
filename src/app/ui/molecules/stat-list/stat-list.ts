import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CvStat } from '@domain/models/cv-stat';
import { RichText } from '../../atoms/rich-text/rich-text';
import { CountUpDirective } from '../../directives/count-up.directive';
import { RevealDirective } from '../../directives/reveal.directive';

/** Headline figures: a large value with what it measures. */
@Component({
  selector: 'dl[sgStatList]',
  imports: [RichText, RevealDirective, CountUpDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'stats' },
  template: `
    @for (stat of stats(); track $index) {
      <div class="stat" [sgReveal]="$index">
        <dt class="stat__label">
          <sg-rich-text [text]="stat.label" />
          @if (stat.detail) {
            <span class="stat__detail">{{ stat.detail }}</span>
          }
        </dt>
        <dd class="stat__value" [sgCountUp]="stat.value">{{ stat.value }}</dd>
      </div>
    }
  `,
})
export class StatList {
  readonly stats = input.required<readonly CvStat[]>();
}
