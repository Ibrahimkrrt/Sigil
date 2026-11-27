import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { RevealDirective } from '../../directives/reveal.directive';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { VizItem } from './viz-item';

/**
 * An interactive visualisation: each item is a block sized by its value, and choosing
 * one brings its detail forward. The same data is always present as text.
 */
@Component({
  selector: 'figure[sgVizField]',
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  hostDirectives: [RevealDirective],
  host: { class: 'viz' },
  template: `
    @if (title()) {
      <figcaption class="chart__title">{{ title() }}</figcaption>
    }
    <div class="viz__field" role="group" [attr.aria-label]="title() || ('Visualisation' | t)">
      @for (item of items(); track $index) {
        <button type="button" class="viz__item" [attr.aria-pressed]="chosen() === item" [style.--size]="size(item)" (click)="chosen.set(item)">
          <span class="viz__ball" aria-hidden="true"></span>
          <span class="viz__label">{{ item.label }}</span>
          <span class="viz__value">{{ item.value }}{{ unit() }}</span>
        </button>
      }
    </div>
    <p class="viz__detail" aria-live="polite">
      @if (chosen(); as item) {
        {{ item.label }}: {{ item.detail || item.value + unit() }}
      } @else {
        {{ 'Select a block to read more.' | t }}
      }
    </p>
  `,
})
export class VizField {
  readonly items = input.required<readonly VizItem[]>();
  readonly title = input('');
  readonly unit = input('');
  protected readonly chosen = signal<VizItem | null>(null);
  private readonly max = computed(() => Math.max(1, ...this.items().map((item) => item.value)));

  protected size(item: VizItem): string {
    return Math.max(0.42, Math.sqrt(item.value / this.max())).toFixed(3);
  }
}
