import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RevealDirective } from '../../directives/reveal.directive';

/** One line of a credentials list: a title, who issued it, a detail, and when. */
@Component({
  selector: 'li[sgInfoRow]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  hostDirectives: [RevealDirective],
  host: { class: 'row', 'data-scramble': '' },
  template: `
    <div>
      <strong class="row__title" data-scramble-text>{{ heading() }}</strong>
      @if (sub()) {
        <span class="row__sub">{{ sub() }}</span>
      }
      @if (detail()) {
        <span class="row__detail">{{ detail() }}</span>
      }
    </div>
    @if (when()) {
      <span class="row__when">{{ when() }}</span>
    }
  `,
})
export class InfoRow {
  readonly heading = input.required<string>();
  readonly sub = input('');
  readonly detail = input('');
  readonly when = input('');
}
