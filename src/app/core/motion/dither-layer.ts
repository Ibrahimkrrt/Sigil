import { Injectable, inject, signal } from '@angular/core';
import { DitherEngine } from '../engine/dither-engine';
import { ChapterScene } from '../theme/chapter-scene';
import { DitherTileOptions } from './dither-tile-options';

/**
 * The page's dither layer: every pattern and image drawn in the chapter's two colours
 * through one shared WebGL context. When WebGL is missing or switched off, nothing is
 * available and visuals fall back to plain CSS.
 */
@Injectable({ providedIn: 'root' })
export class DitherLayer {
  private readonly engine = inject(DitherEngine);
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  private layer: any = null;
  private readonly ready = signal(false);

  /** True while tiles can be drawn. */
  readonly available = this.ready.asReadonly();

  /** Start the layer for a page. Does nothing when it is already running or WebGL is refused. */
  enable(root: HTMLElement, motion: number): void {
    if (this.layer) return;
    try {
      this.layer = this.engine.createDither({ motion, root });
    } catch {
      this.layer = null;
    }
    if (this.layer) this.layer.start();
    this.ready.set(!!this.layer);
  }

  disable(): void {
    this.layer?.destroy();
    this.layer = null;
    this.ready.set(false);
  }

  /** A canvas that draws one tile, or null when the layer is not available. */
  tile(options: DitherTileOptions): HTMLCanvasElement | null {
    return this.layer ? this.layer.tile({ px: 4, ...options }) : null;
  }

  /** Stop drawing a tile that has left the page. */
  forget(canvas: HTMLCanvasElement | null): void {
    if (canvas) this.layer?.forget(canvas);
  }

  /** Re-ink every tile; colours ease to the new chapter. */
  paint(scene: ChapterScene): void {
    this.layer?.setColors(scene);
  }

  /** Scroll speed in viewport heights per second: bends the tiles a little. */
  push(velocity: number): void {
    this.layer?.setVelocity(velocity);
  }

  run(on: boolean): void {
    if (on) this.layer?.start();
    else this.layer?.stop();
  }

  pause(on: boolean): void {
    this.layer?.pause(on);
  }
}
