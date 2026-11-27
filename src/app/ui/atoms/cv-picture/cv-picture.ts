import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, afterRenderEffect, booleanAttribute, computed, inject, input, signal, viewChild } from '@angular/core';
import { AssetResolver } from '@core/assets/asset-resolver';
import { DitherLayer } from '@core/motion/dither-layer';
import { CvImage } from '@domain/models/cv-image';
import { PatternTile } from '../pattern-tile/pattern-tile';

/**
 * An image that can never appear broken. With the dither layer it is shown dithered in
 * the chapter's colours and reveals itself on hover or focus; the real image always stays
 * in the page for its alternative text. When it is missing, unsafe or fails to load, a
 * generated pattern takes its place, so no section is ever empty.
 */
@Component({
  selector: 'sg-cv-picture',
  imports: [PatternTile],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'pic', '[class.pic--gen]': '!url()', '[class.pic--dithered]': 'dithered()', 'data-hover': '' },
  template: `
    @if (url(); as src) {
      <img #img [src]="src" [alt]="image()?.alt ?? ''" [attr.loading]="eager() ? null : 'lazy'" decoding="async" (error)="failed.set(true)" />
    } @else {
      <sg-pattern-tile [seed]="seed() || image()?.src || 'visual'" />
    }
  `,
})
export class CvPicture {
  private readonly assets = inject(AssetResolver);
  private readonly layer = inject(DitherLayer);
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly image = input.required<CvImage | null>();
  /** The seed of the pattern shown when there is no image. */
  readonly seed = input('');
  readonly eager = input(false, { transform: booleanAttribute });
  protected readonly failed = signal(false);
  protected readonly dithered = signal(false);
  protected readonly url = computed(() => {
    const image = this.image();
    return image && !this.failed() ? this.assets.resolve(image.src) : null;
  });
  private readonly img = viewChild<ElementRef<HTMLImageElement>>('img');

  constructor() {
    let canvas: HTMLCanvasElement | null = null;
    const clear = (): void => {
      this.layer.forget(canvas);
      canvas?.remove();
      canvas = null;
      this.dithered.set(false);
    };
    afterRenderEffect(() => {
      const available = this.layer.available();
      const img = this.img()?.nativeElement;
      const url = this.url();
      clear();
      if (!available || !img || !url) return;
      canvas = this.layer.tile({ image: img, seed: url, hoverEl: this.element.nativeElement });
      if (!canvas) return;
      canvas.addEventListener('dither:ready', () => this.dithered.set(true), { once: true });
      this.element.nativeElement.append(canvas);
    });
    inject(DestroyRef).onDestroy(clear);
  }
}
