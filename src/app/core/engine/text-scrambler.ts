import { Injectable, inject } from '@angular/core';

/**
 * Labels that resolve out of random glyphs when pointed at.
 * Lifted from the reference engine; values are loosely typed inside.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
@Injectable({ providedIn: 'root' })
export class TextScrambler {
  private GLYPHS: any = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&/<>[]{}=+*';

  /** Resolve an element's text out of random glyphs, left to right. */
  scramble(el: any, text: any = el.dataset.text || el.textContent, duration: any = 520): any {
    if (el._scramble) cancelAnimationFrame(el._scramble);
    // Each word is frozen at its real width first, so random glyphs can never change where lines break or push the layout.
    const parts: any = text.split(/(\s+)/);
    el.textContent = '';
    const cells: any = parts.map((part: any) => {
      if (!part || /^\s+$/.test(part)) { el.append(part); return null; }
      const span: any = document.createElement('span');
      span.textContent = part;
      el.append(span);
      return { span, chars: [...part] };
    });
    for (const c of (cells as any)) if (c) c.w = c.span.getBoundingClientRect().width;
    const scale: any = el.offsetWidth ? el.getBoundingClientRect().width / el.offsetWidth || 1 : 1;
    for (const c of (cells as any)) if (c) c.span.style.cssText = `display:inline-block;width:${(c.w / scale).toFixed(2)}px;white-space:nowrap;overflow:hidden;vertical-align:bottom`;
    const total: any = cells.reduce((n: any, c: any) => n + (c ? c.chars.length : 0), 0);
    const t0: any = performance.now();
    const tick: any = (now: any) => {
      const p: any = Math.min(1, (now - t0) / duration);
      let seen: any = 0;
      const done: any = Math.floor(p * total);
      for (const c of (cells as any)) {
        if (!c) continue;
        c.span.textContent = c.chars.map((ch: any, i: any) => (seen + i < done ? ch : this.GLYPHS[(Math.random() * this.GLYPHS.length) | 0])).join('');
        seen += c.chars.length;
      }
      if (p < 1) el._scramble = requestAnimationFrame(tick); else { el.textContent = text; el._scramble = 0; }
    };
    el._scramble = requestAnimationFrame(tick);
  }

  /** Scramble on hover for every [data-scramble] inside root. */
  watchScramble(root: any, motion: any): any {
    if (motion <= 0) return () => {};
    const on: any = (e: any) => {
      const host: any = e.target.closest?.('[data-scramble]');
      if (!host || host._hot) return;
      host._hot = true;
      const label: any = host.querySelector('[data-scramble-text]') || host;
      if (!label.dataset.text) label.dataset.text = label.textContent;
      this.scramble(label, label.dataset.text, 380);
    };
    const off: any = (e: any) => { const host: any = e.target.closest?.('[data-scramble]'); if (host && !host.contains(e.relatedTarget)) host._hot = false; };
    // Pointer only: on keyboard focus the label must stay readable for screen readers.
    root.addEventListener('pointerover', on);
    root.addEventListener('pointerout', off);
    return () => { root.removeEventListener('pointerover', on); root.removeEventListener('pointerout', off); };
  }
}
