import { Injectable, computed, signal } from '@angular/core';

/**
 * How much the page may move. The reader's system setting comes first, then the CV's
 * own motion amount, then the pause control, which is remembered between visits.
 */
@Injectable({ providedIn: 'root' })
export class MotionSettings {
  private readonly storageKey = 'sigil-motion';
  private readonly reduced = signal(typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);
  private readonly themeAmount = signal(0.8);
  private readonly held = signal(this.remembered());

  /** True while the reader has paused everything that moves on its own. */
  readonly paused = this.held.asReadonly();
  /** Motion amount from 0 (still) to 1. Zero when the reader prefers reduced motion. */
  readonly level = computed(() => (this.reduced() ? 0 : this.themeAmount()));
  readonly enabled = computed(() => this.level() > 0);

  /** Take the motion amount of the CV on screen. */
  useThemeAmount(amount: number): void {
    this.themeAmount.set(amount);
  }

  pause(on: boolean): void {
    this.held.set(on);
    try {
      localStorage.setItem(this.storageKey, on ? 'paused' : 'running');
    } catch {
      // Storage is unavailable (private window, blocked site data): the choice lasts for this visit.
    }
  }

  private remembered(): boolean {
    try {
      return localStorage.getItem(this.storageKey) === 'paused';
    } catch {
      return false;
    }
  }
}
