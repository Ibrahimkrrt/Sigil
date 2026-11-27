import { Injectable, signal } from '@angular/core';

/** Follows the page as it scrolls: which chapter holds the middle of the screen, and how far down the reader is. */
@Injectable({ providedIn: 'root' })
export class ChapterTracker {
  private readonly active = signal<string | null>(null);
  private readonly travelled = signal(0);

  /** The id of the chapter at the middle of the viewport. */
  readonly activeId = this.active.asReadonly();
  /** Scroll progress through the page, from 0 to 1. */
  readonly progress = this.travelled.asReadonly();

  /** Start following the given chapters, in page order. Returns a function that stops. */
  watch(chapters: readonly HTMLElement[]): () => void {
    let queued = false;
    const measure = (): void => {
      queued = false;
      const middle = window.innerHeight * 0.5;
      let current = chapters[0];
      for (const chapter of chapters) {
        if (chapter.getBoundingClientRect().top <= middle) current = chapter;
        else break;
      }
      this.active.set(current?.id ?? null);
      const max = document.documentElement.scrollHeight - window.innerHeight;
      this.travelled.set(max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0);
    };
    const queue = (): void => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(measure);
    };
    window.addEventListener('scroll', queue, { passive: true });
    window.addEventListener('resize', queue);
    measure();
    return () => {
      window.removeEventListener('scroll', queue);
      window.removeEventListener('resize', queue);
    };
  }
}
