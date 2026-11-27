import { Injectable, inject } from '@angular/core';

/**
 * Sideways strips that can be dragged, with inertia.
 * Lifted from the reference engine; values are loosely typed inside.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
@Injectable({ providedIn: 'root' })
export class DragScroller {
  /** Drag a horizontal strip with the pointer, with a little inertia. Keyboard and wheel use native scrolling. */
  dragScroll(root: any): any {
    const offs: any = [];
    root.querySelectorAll('[data-drag]').forEach((el: any) => {
      let down: any = false, sx: any = 0, sl: any = 0, v: any = 0, lastX: any = 0, lastT: any = 0, raf: any = 0, moved: any = false;
      const glide: any = () => { el.scrollLeft -= v; v *= 0.94; raf = Math.abs(v) > 0.3 ? requestAnimationFrame(glide) : 0; if (!raf) el.classList.remove('is-dragging'); };
      const pd: any = (e: any) => { if (e.pointerType !== 'mouse' || e.button !== 0) return; down = true; moved = false; sx = lastX = e.clientX; sl = el.scrollLeft; lastT = performance.now(); v = 0; cancelAnimationFrame(raf); };
      const pm: any = (e: any) => {
        if (!down) return;
        const dx: any = e.clientX - sx;
        if (!moved && Math.abs(dx) > 4) { moved = true; el.classList.add('is-dragging'); }
        if (!moved) return;
        el.scrollLeft = sl - dx;
        const now: any = performance.now(); v = ((e.clientX - lastX) / Math.max(1, now - lastT)) * 16; lastX = e.clientX; lastT = now;
      };
      const pu: any = () => { if (!down) return; down = false; if (moved) raf = requestAnimationFrame(glide); };
      const click: any = (e: any) => { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } };
      el.addEventListener('pointerdown', pd); window.addEventListener('pointermove', pm); window.addEventListener('pointerup', pu); el.addEventListener('click', click, true);
      offs.push(() => { el.removeEventListener('pointerdown', pd); window.removeEventListener('pointermove', pm); window.removeEventListener('pointerup', pu); el.removeEventListener('click', click, true); cancelAnimationFrame(raf); });
    });
    return () => offs.forEach((f: any) => f());
  }
}
