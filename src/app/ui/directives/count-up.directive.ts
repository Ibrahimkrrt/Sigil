import { DestroyRef, Directive, ElementRef, afterNextRender, inject, input } from '@angular/core';
import { CountUp } from '@core/engine/count-up';
import { MotionSettings } from '@core/motion/motion-settings';

/** Counts a figure up to its value the first time it comes into view. With motion off the value is simply there. */
@Directive({ selector: '[sgCountUp]', host: { '[attr.data-count]': 'sgCountUp()' } })
export class CountUpDirective {
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly counter = inject(CountUp);
  private readonly motion = inject(MotionSettings);
  /** The final text of the figure: "68%", "6.2M". */
  readonly sgCountUp = input.required<string>();

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      if (!this.motion.enabled() || typeof IntersectionObserver !== 'function') return;
      const observer = new IntersectionObserver((entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        this.counter.countUp(this.element.nativeElement, 600 + 600 * this.motion.level());
      }, { threshold: 0.4 });
      observer.observe(this.element.nativeElement);
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }
}
