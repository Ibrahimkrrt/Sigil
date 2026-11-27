import { Injectable, inject } from '@angular/core';
import { DomBuilder } from './dom-builder';

/**
 * The custom pointer: a square that inverts what it crosses and carries a verb.
 * Lifted from the reference engine; values are loosely typed inside.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
@Injectable({ providedIn: 'root' })
export class PointerCursor {
  private readonly dom = inject(DomBuilder);
  private readonly h = (tag: string, attrs?: any, ...kids: any[]): any => this.dom.h(tag, attrs, ...kids);

  private fine: any = () => typeof matchMedia === 'function' && matchMedia('(pointer: fine)').matches;

  /** A custom cursor: a small block that grows into a label over interactive things. */
  customCursor(root: any, motion: any): any {
    if (motion <= 0 || !this.fine()) return () => {};
    // Two pieces that move together: a block that marks the exact point, and a label beside it that never covers that point.
    const el: any = this.h('div', { class: 'cursor', 'aria-hidden': 'true' });
    const label: any = this.h('div', { class: 'cursor__label', 'aria-hidden': 'true' });
    root.append(el, label);
    root.classList.add('has-cursor');
    let x: any = 0, y: any = 0, cx: any = 0, cy: any = 0, raf: any = 0, shown: any = false;
    const loop: any = () => {
      cx += (x - cx) * 0.28; cy += (y - cy) * 0.28;
      el.style.transform = label.style.transform = `translate3d(${cx.toFixed(1)}px, ${cy.toFixed(1)}px, 0)`;
      raf = Math.abs(x - cx) + Math.abs(y - cy) > 0.2 ? requestAnimationFrame(loop) : 0;
    };
    const move: any = (e: any) => {
      x = e.clientX; y = e.clientY;
      if (!shown) { shown = true; cx = x; cy = y; el.classList.add('is-on'); }
      const t: any = e.target.closest?.('[data-cursor], a, button, summary, input, select, textarea, [role="tab"]');
      const text: any = t?.closest('[data-cursor]')?.dataset.cursor || '';
      if (label.textContent !== text) label.textContent = text;
      el.classList.toggle('is-link', !!t && !text);
      el.classList.toggle('is-label', !!text);
      label.classList.toggle('is-on', !!text);
      if (!raf) raf = requestAnimationFrame(loop);
    };
    const leave: any = () => { shown = false; el.classList.remove('is-on'); label.classList.remove('is-on'); };
    window.addEventListener('pointermove', move, { passive: true });
    document.addEventListener('pointerleave', leave);
    return () => { window.removeEventListener('pointermove', move); document.removeEventListener('pointerleave', leave); cancelAnimationFrame(raf); el.remove(); label.remove(); root.classList.remove('has-cursor'); };
  }
}
