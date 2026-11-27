import { ChangeDetectionStrategy, Component, booleanAttribute, computed, inject, input } from '@angular/core';
import { Translator } from '@core/i18n/translator';
import { CvRolePartShare } from '@domain/models/cv-role-part-share';
import { TranslatePipe } from '../../pipes/translate.pipe';

/** How a role splits into its parts (full-stack into front-end and back-end), each sized by its missions. */
@Component({
  selector: 'ul[sgSplitBar]',
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'split', '[class.split--sm]': 'small()', '[attr.aria-label]': 'label()' },
  template: `
    @for (part of parts(); track part.id) {
      <li class="split__part" [class]="'split__part--' + ($index % 2)" [style.--share]="share(part)">
        <span class="split__name">{{ part.name }}</span>
        @if (part.count) {
          <span class="split__n">{{ (part.count === 1 ? '{n} mission' : '{n} missions') | t: { n: part.count } }}</span>
        }
      </li>
    }
  `,
})
export class SplitBar {
  readonly parts = input.required<readonly CvRolePartShare[]>();
  readonly small = input(false, { transform: booleanAttribute });
  private readonly translator = inject(Translator);
  private readonly total = computed(() => this.parts().reduce((sum, part) => sum + Math.max(1, part.count), 0));

  protected label(): string {
    return this.translator.t('Made of');
  }

  protected share(part: CvRolePartShare): string {
    return (Math.max(1, part.count) / this.total()).toFixed(3);
  }
}
