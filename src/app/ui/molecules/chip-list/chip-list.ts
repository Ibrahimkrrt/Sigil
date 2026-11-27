import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** A wrapping row of small labels. */
@Component({
  selector: 'ul[sgChipList]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'chips', '[class]': 'variant()' },
  template: `
    @for (item of items(); track $index) {
      <li class="chip">{{ item }}</li>
    }
  `,
})
export class ChipList {
  readonly items = input.required<readonly string[]>();
  /** A modifier class: `chips--mono` or `chips--lg`. */
  readonly variant = input('');
}
