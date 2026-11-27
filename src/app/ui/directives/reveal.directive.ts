import { Directive, ElementRef, afterNextRender, inject, input, signal } from '@angular/core';
import { DestroyRef } from '@angular/core';
import { MotionSettings } from '@core/motion/motion-settings';

/**
 * Brings an element in as it enters the viewport. Content is only ever hidden while
 * this is watching: with motion off, everything is visible at rest.
 */
@Directive({
  selector: '[sgReveal]',
  host: { 'data-reveal': '', '[class.is-in]': 'shown()', '[style.--d]': 'delay()' },
})
export class RevealDirective {
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly motion = inject(MotionSettings);
  private readonly destroyRef = inject(DestroyRef);
  /** Position among its siblings, to stagger neighbours. */
  readonly sgReveal = input<number | ''>('');
  protected readonly shown = signal(false);

  constructor() {
    afterNextRender(() => {
      if (!this.motion.enabled() || typeof IntersectionObserver !== 'function') {
        this.shown.set(true);
        return;
      }
      const observer = new IntersectionObserver((entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        this.shown.set(true);
        observer.disconnect();
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
      observer.observe(this.element.nativeElement);
      this.destroyRef.onDestroy(() => observer.disconnect());
    });
  }

  protected delay(): string {
    const index = this.sgReveal();
    return `${(typeof index === 'number' ? index % 4 : 0) * 70}ms`;
  }
}
