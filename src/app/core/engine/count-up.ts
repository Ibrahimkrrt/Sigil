import { Injectable } from '@angular/core';

/**
 * Counts a figure up to its value when it comes into view.
 * Lifted from the reference engine; values are loosely typed inside.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
@Injectable({ providedIn: 'root' })
export class CountUp {
  countUp(el: any, duration: any): any {
    const final: any = el.dataset.count;
    const m: any = /^([^\d]*?)(\d[\d,]*\.?\d*)(.*)$/.exec(final);
    if (!m) return;
    const target: any = parseFloat(m[2].replace(/,/g, ''));
    const decimals: any = (m[2].split('.')[1] || '').length;
    const t0: any = performance.now();
    const tick: any = (now: any) => {
      const p: any = Math.min(1, (now - t0) / duration);
      const eased: any = 1 - (1 - p) ** 3;
      el.textContent = p < 1 ? `${m[1]}${(target * eased).toFixed(decimals)}${m[3]}` : final;
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
}
