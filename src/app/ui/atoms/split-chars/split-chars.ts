import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Text set one letter per element, so each letter can be animated on its own. Decorative: label the parent. */
@Component({
  selector: 'sg-split-chars',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'sg-contents' },
  template: `@for (char of chars(); track $index) {<span class="char" [style.--i]="start() + $index">{{ char }}</span>}`,
})
export class SplitChars {
  readonly text = input.required<string>();
  /** The index of the first letter, when a line continues another. */
  readonly start = input(0);
  protected readonly chars = computed(() => [...this.text()]);
}
