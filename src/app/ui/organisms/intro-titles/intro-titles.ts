import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, afterNextRender, inject, input, output, signal, viewChild } from '@angular/core';
import { TextScrambler } from '@core/engine/text-scrambler';
import { SigilMark } from '../../atoms/sigil-mark/sigil-mark';

/** The opening titles: the name resolves and a counter runs to one hundred, then the page takes over. Decorative. */
@Component({
  selector: 'sg-intro-titles',
  imports: [SigilMark],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'intro', 'aria-hidden': 'true', '[class.is-done]': 'done()', '[style.--p]': 'progress()' },
  template: `
    <span class="intro__bar"></span>
    <div class="intro__mark"><svg sgSigilMark [seed]="seed()"></svg><span>SIG {{ code() }}</span></div>
    <div class="intro__row">
      <span class="intro__name" #word>{{ name() }}</span>
      <span class="intro__count">{{ count() }}</span>
    </div>
  `,
})
export class IntroTitles {
  private readonly scrambler = inject(TextScrambler);
  readonly name = input.required<string>();
  readonly seed = input.required<string>();
  readonly code = input.required<string>();
  /** The titles have run; the page can make its entrance. */
  readonly finished = output<void>();
  /** The titles have faded and can be removed. */
  readonly gone = output<void>();

  protected readonly done = signal(false);
  protected readonly progress = signal('0');
  protected readonly count = signal('000');
  private readonly nameElement = viewChild.required<ElementRef<HTMLElement>>('word');

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const started = performance.now();
      const duration = 1150;
      let frame = 0;
      const step = (now: number): void => {
        const p = Math.min(1, (now - started) / duration);
        this.count.set(String(Math.round((1 - (1 - p) ** 3) * 100)).padStart(3, '0'));
        this.progress.set(p.toFixed(3));
        if (p < 1) {
          frame = requestAnimationFrame(step);
          return;
        }
        this.done.set(true);
        this.finished.emit();
        setTimeout(() => this.gone.emit(), 700);
      };
      frame = requestAnimationFrame(step);
      this.scrambler.scramble(this.nameElement().nativeElement, this.name(), 900);
      destroyRef.onDestroy(() => cancelAnimationFrame(frame));
    });
  }
}
