import { Injectable } from '@angular/core';

/**
 * Builds DOM elements for the imperative effects (pointer, film, toasts), which draw
 * outside Angular's templates. Text is always set as text, never parsed as HTML.
 * Lifted from the reference engine; values are loosely typed inside.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
@Injectable({ providedIn: 'root' })
export class DomBuilder {
  // DOM helpers. All content reaches the page as text nodes or vetted attributes:
  // nothing from the CV JSON is ever parsed as HTML.
  private SVGNS: any = 'http://www.w3.org/2000/svg';

  /** Create an element. Tags prefixed "svg:" are created in the SVG namespace. */
  h(tag: any, attrs: any, ...kids: any[]): any {
    const el: any = tag.startsWith('svg:') ? document.createElementNS(this.SVGNS, tag.slice(4)) : document.createElement(tag);
    for (const [k, v] of (Object.entries(attrs || {}) as any)) {
      if (v == null || v === false) continue;
      if (k === 'style' && typeof v === 'object') {
        for (const [p, val] of (Object.entries(v) as any)) if (val != null) el.style.setProperty(p, String(val));
      } else if (k.startsWith('on') && typeof v === 'function') {
        el.addEventListener(k.slice(2), v);
      } else {
        el.setAttribute(k, v === true ? '' : String(v));
      }
    }
    return this.append(el, kids);
  }

  append(el: any, ...kids: any[]): any {
    for (const kid of (kids.flat(Infinity) as any)) {
      if (kid == null || kid === false || kid === '') continue;
      el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
    }
    return el;
  }
}
