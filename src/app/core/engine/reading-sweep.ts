import { Injectable, inject } from '@angular/core';

/**
 * The opening statement read word by word as the page scrolls.
 * Lifted from the reference engine; values are loosely typed inside.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
@Injectable({ providedIn: 'root' })
export class ReadingSweep {
  /** Scroll-linked reading: words of a statement take full ink as they pass the middle of the viewport. */
  wordReveal(root: any, scroller: any, motion: any): any {
    const hosts: any = [...root.querySelectorAll('[data-words]')];
    if (motion <= 0 || !hosts.length) return { update() {} };
    hosts.forEach((host: any) => host.classList.add('is-reading'));
    return {
      update() {
        const vh: any = scroller === window ? window.innerHeight : scroller.clientHeight;
        const top0: any = scroller === window ? 0 : scroller.getBoundingClientRect().top;
        for (const host of (hosts as any)) {
          const r: any = host.getBoundingClientRect();
          if (r.bottom < top0 - 50 || r.top > top0 + vh + 50) continue;
          const p: any = Math.min(1, Math.max(0, (top0 + vh * 0.82 - r.top) / (r.height + vh * 0.42)));
          const words: any = host._words || (host._words = [...host.querySelectorAll('.w')]);
          const n: any = Math.round(p * words.length);
          if (host._n === n) continue;
          host._n = n;
          words.forEach((w: any, i: any) => w.classList.toggle('is-read', i < n));
        }
      },
    };
  }
}
