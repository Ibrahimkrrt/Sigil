import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, afterRenderEffect, booleanAttribute, computed, inject, input } from '@angular/core';
import { CvStore } from '@core/cv/state/cv-store';
import { DitherLayer } from '@core/motion/dither-layer';
import { PATTERNS } from '@core/theme/patterns';
import { hash } from '@domain/text/hash';

/**
 * A generated pattern in the chapter's two colours, chosen by a seed. Everything
 * generated is keyed on the CV's signature, so each person's patterns are their own.
 * Drawn by the dither layer when it is available, in plain CSS otherwise.
 */
@Component({
  selector: 'sg-pattern-tile',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'dither', '[class.dither--css]': '!layer.available()', '[class]': 'layer.available() ? "" : "dither--" + name()', 'aria-hidden': 'true' },
  template: ``,
})
export class PatternTile {
  private readonly store = inject(CvStore);
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  protected readonly layer = inject(DitherLayer);
  readonly seed = input.required<string>();
  /** A named pattern, instead of the one the seed would choose. */
  readonly pattern = input<string | null>(null);
  /** Draw in the ground and a quiet tint, for a pattern that sits behind text. */
  readonly quiet = input(false, { transform: booleanAttribute });
  private readonly key = computed(() => `${this.store.model()?.theme.seed ?? ''}/${this.seed()}`);
  protected readonly name = computed(() => this.pattern() ?? PATTERNS[hash(this.key()) % PATTERNS.length]);

  constructor() {
    let canvas: HTMLCanvasElement | null = null;
    const clear = (): void => {
      this.layer.forget(canvas);
      canvas?.remove();
      canvas = null;
    };
    afterRenderEffect(() => {
      const available = this.layer.available();
      const options = { pattern: this.name(), seed: this.key(), mode: this.quiet() ? ('tone' as const) : ('duo' as const), px: this.quiet() ? 5 : 4 };
      clear();
      if (!available) return;
      canvas = this.layer.tile(options);
      if (canvas) this.element.nativeElement.append(canvas);
    });
    inject(DestroyRef).onDestroy(clear);
  }
}
