import { Injectable, inject } from '@angular/core';

/**
 * Running strips, pushed by scroll speed.
 * Lifted from the reference engine; values are loosely typed inside.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
@Injectable({ providedIn: 'root' })
export class MarqueeRunner {
  /**
   * Marquees: a strip of words that runs forever and speeds up with scrolling.
   * The strip is decorative (aria-hidden); its words come from content shown elsewhere.
   */
  runMarquees(root: any, motion: any): any {
    const strips: any = [...root.querySelectorAll('.marquee__track')];
    if (motion <= 0 || !strips.length) return { push() {}, pause() {}, destroy() {} };
    let boost: any = 0, raf: any = 0, last: any = performance.now(), paused: any = false;
    const state: any = strips.map((el: any, i: any) => ({ el, x: 0, dir: i % 2 ? 1 : -1, w: 0 }));
    const loop: any = (now: any) => {
      const dt: any = Math.min(0.05, (now - last) / 1000); last = now;
      boost *= 0.92;
      for (const s of (state as any)) {
        if (!s.w) s.w = s.el.scrollWidth / 2;
        if (!s.w) continue;
        s.x += s.dir * (46 * motion + Math.abs(boost) * 900) * dt * (boost < 0 ? -1 : 1);
        s.x = ((s.x % s.w) - s.w) % s.w;
        s.el.style.transform = `translate3d(${s.x.toFixed(1)}px, 0, 0) skewX(${(boost * -14).toFixed(2)}deg)`;
      }
      raf = document.hidden || paused ? 0 : requestAnimationFrame(loop);
    };
    const vis: any = () => { if (!document.hidden && !paused && !raf) { last = performance.now(); raf = requestAnimationFrame(loop); } };
    document.addEventListener('visibilitychange', vis);
    raf = requestAnimationFrame(loop);
    return { push(v: any) { boost = paused ? 0 : Math.max(-1, Math.min(1, v)); }, pause(v: any) { paused = !!v; vis(); }, destroy() { cancelAnimationFrame(raf); document.removeEventListener('visibilitychange', vis); } };
  }
}
