import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CvMilestone } from '@domain/models/cv-milestone';
import { RichText } from '../../atoms/rich-text/rich-text';
import { RevealDirective } from '../../directives/reveal.directive';

/** Dated turning points, in order. */
@Component({
  selector: 'ol[sgTimelineList]',
  imports: [RichText, RevealDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'tl' },
  template: `
    @for (item of items(); track $index) {
      <li class="tl__item" [sgReveal]="$index">
        <span class="tl__dot" aria-hidden="true"></span>
        @if (item.date) {
          <span class="tl__date">{{ item.date }}</span>
        }
        <strong class="tl__title">{{ item.title }}</strong>
        @if (item.text) {
          <span class="tl__text"><sg-rich-text [text]="item.text" /></span>
        }
      </li>
    }
  `,
})
export class TimelineList {
  readonly items = input.required<readonly CvMilestone[]>();
}
