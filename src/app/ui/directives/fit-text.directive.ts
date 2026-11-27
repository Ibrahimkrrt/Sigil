import { DestroyRef, Directive, ElementRef, afterNextRender, inject, input } from '@angular/core';

/**
 * Sizes display type so its longest line fills the element: the name is the poster.
 * The size is written to the `--fit` custom property. Lines are the descendants
 * marked `data-fit-line`, or the element itself.
 */
@Directive({ selector: '[sgFitText]' })
export class FitTextDirective {
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  /** The largest size allowed, as a fraction of the viewport height. */
  readonly sgFitText = input(0.3);

  constructor() {
    afterNextRender(() => {
      const el = this.element.nativeElement;
      const run = (): void => this.fit(el);
      // Fitted on the next frame: changing layout inside the observer's own callback would make it loop.
      const observer = new ResizeObserver(() => requestAnimationFrame(run));
      observer.observe(el.closest('.scv') ?? el);
      void document.fonts?.ready.then(run);
      document.fonts?.addEventListener?.('loadingdone', run);
      run();
      this.destroyRef.onDestroy(() => {
        observer.disconnect();
        document.fonts?.removeEventListener?.('loadingdone', run);
      });
    });
  }

  private fit(el: HTMLElement): void {
    const available = el.clientWidth;
    if (available <= 0) return;
    const lines = el.querySelectorAll('[data-fit-line]');
    const targets = lines.length ? [...lines] : [el];
    const widest = (): number => Math.max(1, ...targets.map((line) => {
      const range = document.createRange();
      range.selectNodeContents(line);
      return range.getBoundingClientRect().width;
    }));
    const max = window.innerHeight * this.sgFitText();
    // Width is not linear in size (the font has an optical-size axis), so converge in a few passes.
    let size = 100;
    for (let pass = 0; pass < 4; pass++) {
      el.style.setProperty('--fit', `${size.toFixed(1)}px`);
      const next = Math.max(20, Math.min((size * available * 0.96) / widest(), max));
      if (Math.abs(next - size) < 0.5) break;
      size = next;
    }
    el.style.setProperty('--fit', `${size.toFixed(1)}px`);
    // At the smallest size a very long line is allowed to wrap rather than leave the page.
    el.toggleAttribute('data-fit-wrap', size <= 20.5 && widest() > available);
  }
}
