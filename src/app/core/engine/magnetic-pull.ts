import { Injectable, inject } from '@angular/core';

/**
 * Controls that lean toward the pointer.
 * Lifted from the reference engine; values are loosely typed inside.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
@Injectable({ providedIn: 'root' })
export class MagneticPull {
  private fine: any = () => typeof matchMedia === 'function' && matchMedia('(pointer: fine)').matches;

  /** Buttons that lean toward the pointer. */
  magnetic(root: any, motion: any): any {
    if (motion <= 0 || !this.fine()) return () => {};
    const offs: any = [];
    root.querySelectorAll('[data-magnetic]').forEach((el: any) => {
      const move: any = (e: any) => { const r: any = el.getBoundingClientRect(); el.style.transform = `translate(${(((e.clientX - r.left) / r.width - 0.5) * 12 * motion).toFixed(1)}px, ${(((e.clientY - r.top) / r.height - 0.5) * 10 * motion).toFixed(1)}px)`; };
      const leave: any = () => { el.style.transform = ''; };
      el.addEventListener('pointermove', move); el.addEventListener('pointerleave', leave);
      offs.push(() => { el.removeEventListener('pointermove', move); el.removeEventListener('pointerleave', leave); });
    });
    return () => offs.forEach((f: any) => f());
  }
}
