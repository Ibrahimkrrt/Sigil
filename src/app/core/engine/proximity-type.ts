import { Injectable, inject } from '@angular/core';

/**
 * Display type that reacts to the pointer through the font's own axes.
 * Lifted from the reference engine; values are loosely typed inside.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
@Injectable({ providedIn: 'root' })
export class ProximityType {
  private fine: any = () => typeof matchMedia === 'function' && matchMedia('(pointer: fine)').matches;

  /**
   * Variable-font type that reacts to the pointer: characters near the cursor
   * gain weight and width. Uses the font's own axes, no canvas.
   */
  proximityType(root: any, motion: any): any {
    if (motion <= 0 || !this.fine()) return () => {};
    const hosts: any = [...root.querySelectorAll('[data-proximity]')];
    if (!hosts.length) return () => {};
    let x: any = -9999, y: any = -9999, raf: any = 0;
    const apply: any = () => {
      raf = 0;
      for (const host of (hosts as any)) {
        const r: any = host.getBoundingClientRect();
        const near: any = x > r.left - 260 && x < r.right + 260 && y > r.top - 260 && y < r.bottom + 260;
        if (!near && !host._lit) continue;
        host._lit = near;
        const radius: any = Math.max(140, r.height * 0.9);
        for (const c of (host.querySelectorAll('.char') as any)) {
          const b: any = c.getBoundingClientRect();
          const d: any = Math.hypot(x - (b.left + b.width / 2), y - (b.top + b.height / 2));
          const f: any = near ? Math.max(0, 1 - d / radius) : 0;
          c.style.setProperty('--near', (f * f * motion).toFixed(3));
        }
      }
    };
    const move: any = (e: any) => { x = e.clientX; y = e.clientY; if (!raf) raf = requestAnimationFrame(apply); };
    window.addEventListener('pointermove', move, { passive: true });
    return () => window.removeEventListener('pointermove', move);
  }
}
