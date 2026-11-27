import { Injectable } from '@angular/core';

/**
 * A tagged-PDF writer, lifted from the reference engine: structure tree, bookmarks, links,
 * images with alternative text, and a small drawing surface for designed pages.
 * Values are loosely typed inside; `renderPdf` is its public entry.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
@Injectable({ providedIn: 'root' })
export class PdfWriter {
  // A small, dependency-free PDF writer that produces real text PDFs:
  // selectable text, clickable links, document metadata, bookmarks, and a full
  // tag tree (Tagged PDF) so reading order and headings survive in assistive
  // technology. Text is set in the standard Helvetica family (WinAnsi encoding).

  // Advance widths (1/1000 em) for character codes 32 to 126.
  private W_REG: any = [278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556, 333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584];

  private W_BOLD: any = [278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 333, 333, 584, 584, 584, 611, 975, 722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333, 278, 333, 584, 556, 333, 556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611, 611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584];

  private CP1252: any = { 0x20ac: 0x80, 0x201a: 0x82, 0x0192: 0x83, 0x201e: 0x84, 0x2026: 0x85, 0x2020: 0x86, 0x2021: 0x87, 0x02c6: 0x88, 0x2030: 0x89, 0x0160: 0x8a, 0x2039: 0x8b, 0x0152: 0x8c, 0x017d: 0x8e, 0x2018: 0x91, 0x2019: 0x92, 0x201c: 0x93, 0x201d: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97, 0x02dc: 0x98, 0x2122: 0x99, 0x0161: 0x9a, 0x203a: 0x9b, 0x0153: 0x9c, 0x017e: 0x9e, 0x0178: 0x9f };

  private W_HIGH: any = { 0x80: 556, 0x85: 1000, 0x91: 222, 0x92: 222, 0x93: 333, 0x94: 333, 0x95: 350, 0x96: 556, 0x97: 1000, 0x99: 1000, 0xa0: 278 };

  /** Encode a string as WinAnsi bytes. Characters outside the set are transliterated or replaced by "?". */
  encode(str: any): any {
    const out: any = [];
    for (const ch of (String(str) as any)) {
      const cp: any = ch.codePointAt(0);
      if (cp === 9 || cp === 10 || cp === 13) out.push(32);
      else if (cp >= 32 && cp < 127) out.push(cp);
      else if (cp >= 0xa0 && cp <= 0xff) out.push(cp);
      else if (this.CP1252[cp]) out.push(this.CP1252[cp]);
      else {
        const base: any = ch.normalize('NFKD').replace(/[̀-ͯ]/g, '');
        const ascii: any = [...base].filter((c: any) => c.charCodeAt(0) >= 32 && c.charCodeAt(0) < 127);
        if (ascii.length) ascii.forEach((c: any) => out.push(c.charCodeAt(0)));
        else out.push(63);
      }
    }
    return out;
  }

  private byteWidth(b: any, bold: any): any {
    if (b >= 32 && b < 127) return (bold ? this.W_BOLD : this.W_REG)[b - 32];
    if (this.W_HIGH[b]) return this.W_HIGH[b];
    if (b >= 0xc0) {
      const base: any = String.fromCharCode(b).normalize('NFD').charCodeAt(0);
      if (base >= 32 && base < 127) return (bold ? this.W_BOLD : this.W_REG)[base - 32];
    }
    return 556;
  }

  textWidth: any = (str: any, size: any, bold: any) => this.encode(str).reduce((s: any, b: any) => s + this.byteWidth(b, bold), 0) * size / 1000;

  private hexBytes: any = (bytes: any) => '<' + bytes.map((b: any) => b.toString(16).padStart(2, '0')).join('') + '>';

  private hexText: any = (str: any) => { let s: any = '<FEFF'; for (let i: any = 0; i < str.length; i++) s += str.charCodeAt(i).toString(16).padStart(4, '0'); return s + '>'; };

  private n2: any = (v: any) => (Math.round(v * 100) / 100).toString();

  private xml: any = (s: any) => String(s).replace(/[&<>"']/g, (c: any) => `&#${c.charCodeAt(0)};`).replace(/[^\x20-\x7e]/g, (c: any) => `&#${c.codePointAt(0)};`);

  private rgb: any = (c: any) => c.map((v: any) => this.n2(v / 255)).join(' ');

  PAGE_SIZES: any = { a4: [595.28, 841.89], letter: [612, 792] };

  /**
   * Render a flow of blocks to a PDF.
   *
   * block: {
   *   tag: 'H1'|'H2'|'H3'|'P'|'LI', runs: [{ text, bold, italic, link, color }],
   *   size, leading, before, after, indent, bullet, right: 'text', color, dot: [r,g,b], rule: bool, keep: bool
   * }
   * @returns {Uint8Array}
   */
  renderPdf(input: any, defaults: any = {}): any {
    const self = this;
    // One document can hold several parts (a designed edition followed by an accessible one), each with its own page style.
    const parts: any = Array.isArray(input) && input.length && input[0] && Array.isArray(input[0].blocks) ? input : [{ blocks: input }];
    const { title = 'CV', author = '', subject = '', keywords = '', lang = 'en', size = 'a4', images = {} }: any = defaults;
    const [PW, PH]: any = this.PAGE_SIZES[size] || this.PAGE_SIZES.a4;
    let margin: any, footer: any, footerColor: any, linkColor: any, underlineLinks: any, background: any, ink: any, part: any;
    const use: any = (pt: any) => {
      part = pt; const o: any = { ...defaults, ...pt };
      margin = o.margin ?? 56; footer = o.footer || ''; footerColor = o.footerColor || [74, 79, 89]; linkColor = o.linkColor || null; underlineLinks = !!o.underlineLinks; background = o.background || null; ink = o.ink || [17, 21, 32];
    };
    use(parts[0]);
    const pages: any = [];
    const elems: any = [];     // structure elements
    const annots: any = [];    // link annotations (global order)
    const outline: any = [];
    let page: any, y: any;

    const newElem: any = (S: any, parent: any) => { const e: any = { S, parent, kids: [] }; elems.push(e); if (parent) parent.kids.push({ elem: e }); return e; };
    const doc: any = newElem('Document', null);
    const newPage: any = () => {
      page = { ops: [], annots: [], owners: [], part, margin, footer, footerColor, mono: !!part.monoFooter }; pages.push(page); y = PH - margin;
      if (background) page.ops.push(`/Artifact BMC ${this.rgb(background)} rg 0 0 ${this.n2(PW)} ${this.n2(PH)} re f EMC`);
    };
    const mark: any = (elem: any, tag: any) => { const mcid: any = page.owners.length; page.owners.push(elem); elem.kids.push({ mcid, page }); if (!elem.page) elem.page = page; return `/${tag} <</MCID ${mcid}>> BDC`; };
    let list: any = null;
    const shadings: any = [];
    const imageList: any = Object.entries(images).map(([key, im]: any, i: any) => ({ key, name: `Im${i + 1}`, ...im }));
    // Text helpers shared by the flow and by custom-drawn blocks.
    const fontOf: any = (st: any) => (st.mono ? (st.bold ? 'F5' : 'F4') : st.bold ? 'F2' : st.italic ? 'F3' : 'F1');
    const widthOf: any = (str: any, sz: any, st: any = {}) => { const bytes: any = this.encode(str); return (st.mono ? bytes.length * 0.6 * sz : bytes.reduce((a: any, c: any) => a + this.byteWidth(c, !!st.bold), 0) * sz / 1000) * (st.scaleX || 1) + (st.tracking || 0) * bytes.length; };
    const showText: any = (str: any, x: any, base: any, sz: any, st: any, color: any) => `q BT /${fontOf(st)} ${this.n2(sz)} Tf${st.scaleX && st.scaleX !== 1 ? ` ${this.n2(st.scaleX * 100)} Tz` : ''}${st.tracking ? ` ${this.n2(st.tracking)} Tc` : ''} ${this.rgb(color)} rg ${this.n2(x)} ${this.n2(base)} Td ${this.hexBytes(this.encode(str))} Tj ET Q`;
    const addLink: any = (parentElem: any, str: any, x: any, base: any, sz: any, st: any, color: any, url: any) => {
      const linkElem: any = newElem('Link', parentElem);
      page.ops.push(`${mark(linkElem, 'Link')} ${showText(str, x, base, sz, st, color)} EMC`);
      const tw: any = widthOf(str, sz, st);
      if (underlineLinks) page.ops.push(`/Artifact BMC ${this.rgb(color)} RG 0.6 w ${this.n2(x)} ${this.n2(base - 1.6)} m ${this.n2(x + tw)} ${this.n2(base - 1.6)} l S EMC`);
      const a: any = { page, rect: [x - 1, base - sz * 0.25, x + tw + 1, base + sz * 0.8], url, text: str, elem: linkElem };
      annots.push(a); page.annots.push(a); linkElem.kids.push({ annot: a });
    };
    // What a custom-drawn block (a header band, a row of cards) can use. Everything it draws is either tagged or marked as decoration.
    const canvas: any = () => ({
      PW, PH, margin, x: margin, w: PW - 2 * margin, top: y,
      width: widthOf,
      wrap(str: any, maxW: any, sz: any, st: any = {}) { const out: any = []; let cur: any = ''; for (const w of (String(str).split(/\s+/).filter(Boolean) as any)) { const next: any = cur ? `${cur} ${w}` : w; if (cur && widthOf(next, sz, st) > maxW) { out.push(cur); cur = w; } else cur = next; } if (cur) out.push(cur); return out; },
      rect(x: any, yy: any, w: any, h: any, color: any, { stroke = false, lw = 0.6 }: any = {}) { page.ops.push(`/Artifact BMC ${self.rgb(color)} ${stroke ? `RG ${self.n2(lw)} w` : 'rg'} ${self.n2(x)} ${self.n2(yy)} ${self.n2(w)} ${self.n2(h)} re ${stroke ? 'S' : 'f'} EMC`); },
      line(x1: any, y1: any, x2: any, y2: any, color: any, lw: any = 0.6) { page.ops.push(`/Artifact BMC ${self.rgb(color)} RG ${self.n2(lw)} w ${self.n2(x1)} ${self.n2(y1)} m ${self.n2(x2)} ${self.n2(y2)} l S EMC`); },
      elem(tag: any, parent: any = doc) { return newElem(tag, parent); },
      /** Tagged text. `target` is a tag name (a new element under the document) or an element returned earlier. */
      text(target: any, str: any, x: any, base: any, { size: sz = 10, color = ink, link, ...st }: any = {}) {
        const el: any = typeof target === 'string' ? newElem(target, doc) : target;
        if (!str) return el;
        if (link) addLink(el, str, x, base, sz, st, color, link); else page.ops.push(`${mark(el, el.S)} ${showText(str, x, base, sz, st, color)} EMC`);
        return el;
      },
      image(key: any, x: any, yy: any, w: any, h: any, alt: any = '') {
        const im: any = imageList.find((it: any) => it.key === key);
        if (!im) return false;
        const fig: any = newElem('Figure', doc); fig.alt = alt; fig.bbox = [x, yy, x + w, yy + h];
        page.ops.push(`${mark(fig, 'Figure')} q ${self.n2(w)} 0 0 ${self.n2(h)} ${self.n2(x)} ${self.n2(yy)} cm /${im.name} Do Q EMC`);
        page.images = page.images || new Set(); page.images.add(im);
        return true;
      },
      /** A diagonal gradient through the given colour stops, clipped to the rectangle. Decoration only. */
      gradient(x: any, yy: any, w: any, h: any, stops: any) {
        const sh: any = { name: `Sh${shadings.length + 1}`, coords: [x, yy + h, x + w, yy], stops };
        shadings.push(sh); page.shadings = page.shadings || []; page.shadings.push(sh);
        page.ops.push(`/Artifact BMC q ${self.n2(x)} ${self.n2(yy)} ${self.n2(w)} ${self.n2(h)} re W n /${sh.name} sh Q EMC`);
      },
      bookmark(text: any, level: any = 1) { outline.push({ title: text, page, y: y + 4, level }); },
    });

    for (const pt of (parts as any)) {
    use(pt); newPage(); list = null;
    if (pt.bookmark) outline.push({ title: pt.bookmark, page, y: PH, level: 0 });
    for (const b of (pt.blocks as any)) {
      // A block that draws itself (it states its height so the flow can make room).
      if (b.draw) {
        list = null;
        y -= b.before || 0;
        if (y - b.height < margin + (footer ? 18 : 0) && !b.bleed) newPage();
        b.draw(canvas());
        if (b.bleed && b.advance > PH) page.footer = '';   // a full-page block carries no footer
        y -= (b.advance ?? b.height) + (b.after || 0);
        continue;
      }
      const st0: any = { mono: !!b.mono, scaleX: b.scaleX, tracking: b.tracking };
      const styleOf: any = (r: any) => ({ ...st0, bold: !!r.bold, italic: !!r.italic, mono: !!(r.mono || b.mono) });
      const sz: any = b.size || 10.5;
      const lead: any = sz * (b.leading || 1.4);
      const indent: any = b.indent || 0;
      const left: any = margin + indent, maxW: any = PW - margin - left;
      const badge: any = b.badge ? { sz: sz * 0.74, pad: 5 } : null;
      const rightW: any = b.right ? (badge ? widthOf(b.right, badge.sz, { mono: true, bold: true }) + badge.pad * 2 : this.textWidth(b.right, sz, false)) + 14 : 0;
      const baseColor: any = b.color || ink;
      const railX: any = margin + (b.railX ?? 3.5);
      const railSeg: any = (y1: any, y2: any) => { if (b.rail && y1 > y2) page.ops.push(`/Artifact BMC ${this.rgb(b.rail)} RG 0.8 w ${this.n2(railX)} ${this.n2(y1)} m ${this.n2(railX)} ${this.n2(y2)} l S EMC`); };

      // Break runs into words that carry their style.
      const words: any = [];
      let prevEndsWithSpace: any = true;
      for (const r of (b.runs || [] as any)) {
        const raw: any = String(r.text ?? '');
        const parts: any = raw.split(/\s+/).filter(Boolean);
        // A run that continues straight on from the previous one (bold phrase then a comma) is glued to it.
        parts.forEach((w: any, i: any) => words.push({ w, r, width: widthOf(w, sz, styleOf(r)), glue: i === 0 && !prevEndsWithSpace && !/^\s/.test(raw) }));
        if (raw) prevEndsWithSpace = /\s$/.test(raw);
      }
      const spaceW: any = (r: any) => widthOf(' ', sz, styleOf(r));
      const lines: any = [];
      let cur: any = [], curW: any = 0;
      for (const word of (words as any)) {
        const avail: any = maxW - (lines.length === 0 ? rightW : 0);
        const add: any = (cur.length && !word.glue ? spaceW(word.r) : 0) + word.width;
        if (cur.length && curW + add > avail) { lines.push(cur); cur = [word]; curW = word.width; }
        else { cur.push(word); curW += add; }
      }
      if (cur.length) lines.push(cur);
      if (!lines.length) {
        if (b.rule) { y -= b.before || 0; page.ops.push(`/Artifact BMC ${this.rgb(b.ruleColor || [138, 144, 153])} RG 0.5 w ${this.n2(margin)} ${this.n2(y)} m ${this.n2(PW - margin)} ${this.n2(y)} l S EMC`); y -= b.after || 0; }
        continue;
      }

      railSeg(y, y - (b.before || 0));
      y -= b.before || 0;
      const need: any = b.keepSpace ?? (b.keep ? lead * 3.2 : lead);
      if (y - need < margin + (footer ? 18 : 0)) newPage();

      // Structure: list items group under one L element.
      let elem: any;
      if (b.tag === 'LI') {
        if (!list) list = newElem('L', doc);
        elem = newElem('LI', list);
      } else {
        list = null;
        elem = newElem(b.tag || 'P', doc);
      }
      const body: any = b.tag === 'LI' ? newElem('LBody', elem) : elem;
      const bodyTag: any = b.tag === 'LI' ? 'LBody' : b.tag || 'P';
      if (b.tag === 'H2' || b.tag === 'H1') outline.push({ title: (b.runs || []).map((r: any) => r.text).join(' '), page, y: y + 4, level: b.tag === 'H1' ? 0 : 1 });

      lines.forEach((line: any, li: any) => {
        if (y - lead < margin + (footer ? 18 : 0)) newPage();
        const base: any = y - sz * 0.86;
        railSeg(y, y - lead);
        if (li === 0 && b.node) page.ops.push(`/Artifact BMC ${this.rgb(b.node)} rg ${this.n2(railX - 3.5)} ${this.n2(base + sz * 0.1)} 7 7 re f EMC`);
        if (li === 0 && b.square) page.ops.push(`/Artifact BMC ${this.rgb(b.square)} rg ${this.n2(margin)} ${this.n2(base + sz * 0.05)} ${this.n2(sz * 0.62)} ${this.n2(sz * 0.62)} re f EMC`);
        if (li === 0 && b.dot) {
          // Decorative ink dot before a heading.
          const r: any = sz * 0.3, cx: any = margin + r, cy: any = base + sz * 0.33, k: any = r * 0.5523;
          page.ops.push(`/Artifact BMC ${this.rgb(b.dot)} rg ${this.n2(cx + r)} ${this.n2(cy)} m ${this.n2(cx + r)} ${this.n2(cy + k)} ${this.n2(cx + k)} ${this.n2(cy + r)} ${this.n2(cx)} ${this.n2(cy + r)} c ${this.n2(cx - k)} ${this.n2(cy + r)} ${this.n2(cx - r)} ${this.n2(cy + k)} ${this.n2(cx - r)} ${this.n2(cy)} c ${this.n2(cx - r)} ${this.n2(cy - k)} ${this.n2(cx - k)} ${this.n2(cy - r)} ${this.n2(cx)} ${this.n2(cy - r)} c ${this.n2(cx + k)} ${this.n2(cy - r)} ${this.n2(cx + r)} ${this.n2(cy - k)} ${this.n2(cx + r)} ${this.n2(cy)} c f EMC`);
        }
        if (li === 0 && b.bullet) {
          const lbl: any = newElem('Lbl', elem);
          // Keep the label before the body in the tag tree.
          elem.kids.splice(elem.kids.length - 2, 2, elem.kids[elem.kids.length - 1], elem.kids[elem.kids.length - 2]);
          if (b.bulletBox) { page.ops.push(`${mark(lbl, 'Lbl')} ${showText(' ', left - 12, base, sz, {}, baseColor)} EMC`); page.ops.push(`/Artifact BMC ${this.rgb(b.bulletBox)} rg ${this.n2(left - 11)} ${this.n2(base + sz * 0.16)} ${this.n2(sz * 0.42)} ${this.n2(sz * 0.42)} re f EMC`); }
          else page.ops.push(`${mark(lbl, 'Lbl')} BT /F1 ${this.n2(sz)} Tf ${this.rgb(baseColor)} rg ${this.n2(left - 12)} ${this.n2(base)} Td ${this.hexBytes(this.encode(b.bullet))} Tj ET EMC`);
        }
        // Group consecutive words of the same run into one segment.
        const segs: any = [];
        for (const word of (line as any)) {
          const lastSeg: any = segs[segs.length - 1];
          if (lastSeg && lastSeg.r === word.r) lastSeg.words.push(word.w);
          else segs.push({ r: word.r, words: [word.w], glue: word.glue });
        }
        let x: any = left + (b.dot ? sz * 0.95 : b.square ? sz * 1.1 : 0);
        segs.forEach((seg: any, si: any) => {
          const text: any = seg.words.join(' ') + (si < segs.length - 1 && !segs[si + 1].glue ? ' ' : '');
          const st: any = styleOf(seg.r);
          const w: any = widthOf(text, sz, st);
          const color: any = seg.r.link && linkColor ? linkColor : seg.r.color || baseColor;
          if (seg.r.link) addLink(body, seg.words.join(' '), x, base, sz, st, color, seg.r.link);
          else page.ops.push(`${mark(body, bodyTag)} ${showText(text, x, base, sz, st, color)} EMC`);
          x += w;
        });
        if (li === 0 && b.right) {
          if (badge) {
            // The date as a small filled label, set in the monospaced voice.
            const tw: any = widthOf(b.right, badge.sz, { mono: true, bold: true }), bw: any = tw + badge.pad * 2, bx: any = PW - margin - bw;
            page.ops.push(`/Artifact BMC ${this.rgb(b.badge.fill)} rg ${this.n2(bx)} ${this.n2(base - sz * 0.28)} ${this.n2(bw)} ${this.n2(sz * 1.2)} re f EMC`);
            page.ops.push(`${mark(body, bodyTag)} ${showText(b.right, bx + badge.pad, base + sz * 0.06, badge.sz, { mono: true, bold: true }, b.badge.color)} EMC`);
          } else {
            const rw: any = this.textWidth(b.right, sz, false);
            page.ops.push(`${mark(body, bodyTag)} BT /F1 ${this.n2(sz)} Tf ${this.rgb(b.rightColor || [74, 79, 89])} rg ${this.n2(PW - margin - rw)} ${this.n2(base)} Td ${this.hexBytes(this.encode(b.right))} Tj ET EMC`);
          }
        }
        if (li === 0 && b.lineAfter) { const used: any = line.reduce((a: any, w2: any, k: any) => a + w2.width + (k ? spaceW(w2.r) : 0), 0) + sz * 1.1 + 8; page.ops.push(`/Artifact BMC ${this.rgb(b.lineAfter)} RG 0.6 w ${this.n2(margin + used)} ${this.n2(base + sz * 0.33)} m ${this.n2(PW - margin)} ${this.n2(base + sz * 0.33)} l S EMC`); }
        y -= lead;
      });
      if (b.rule) {
        page.ops.push(`/Artifact BMC ${this.rgb(b.ruleColor || [138, 144, 153])} RG 0.5 w ${this.n2(margin)} ${this.n2(y + lead * 0.25)} m ${this.n2(PW - margin)} ${this.n2(y + lead * 0.25)} l S EMC`);
      }
      railSeg(y, y - (b.after || 0));
      y -= b.after || 0;
    }
    }

    // Footers number the pages of their own part.
    for (const pt of (parts as any)) {
      const own: any = pages.filter((p: any) => p.part === pt && p.footer);
      own.forEach((p: any, i: any) => {
        const text: any = `${p.footer}   ${i + 1} / ${own.length}`;
        p.ops.push(`/Artifact <</Type /Pagination /Subtype /Footer>> BDC BT /${p.mono ? 'F4' : 'F1'} ${p.mono ? 7 : 8} Tf ${this.rgb(p.footerColor)} rg ${this.n2(p.margin)} ${this.n2(p.margin - 22)} Td ${this.hexBytes(this.encode(p.mono ? text.toUpperCase() : text))} Tj ET EMC`);
      });
    }

    // ---- Serialise objects ----
    const objs: any = [];
    const alloc: any = () => { objs.push(''); return objs.length; };
    const catalogId: any = alloc(), pagesId: any = alloc(), infoId: any = alloc(), metaId: any = alloc(), structRootId: any = alloc(), parentTreeId: any = alloc(), outlinesId: any = alloc();
    const fontIds: any = ['Helvetica', 'Helvetica-Bold', 'Helvetica-Oblique', 'Courier', 'Courier-Bold'].map((name: any) => { const id: any = alloc(); objs[id - 1] = `<</Type /Font /Subtype /Type1 /BaseFont /${name} /Encoding /WinAnsiEncoding>>`; return id; });
    pages.forEach((p: any) => { p.id = alloc(); p.contentId = alloc(); });
    // Images are baseline JPEG data, embedded as they are.
    shadings.forEach((sh: any) => {
      sh.id = alloc();
      const c: any = (v: any) => v.map((n: any) => this.n2(n / 255)).join(' '), seg: any = sh.stops.slice(1).map((to: any, i: any) => `<</FunctionType 2 /Domain [0 1] /C0 [${c(sh.stops[i])}] /C1 [${c(to)}] /N 1>>`);
      const fn: any = seg.length === 1 ? seg[0] : `<</FunctionType 3 /Domain [0 1] /Functions [${seg.join(' ')}] /Bounds [${seg.slice(1).map((_: any, i: any) => this.n2((i + 1) / seg.length)).join(' ')}] /Encode [${seg.map(() => '0 1').join(' ')}]>>`;
      objs[sh.id - 1] = `<</ShadingType 2 /ColorSpace /DeviceRGB /Coords [${sh.coords.map(this.n2).join(' ')}] /Function ${fn} /Extend [true true]>>`;
    });
    imageList.forEach((im: any) => { im.id = alloc(); let bin: any = ''; for (let i: any = 0; i < im.bytes.length; i += 8192) bin += String.fromCharCode.apply(null, im.bytes.subarray(i, i + 8192)); objs[im.id - 1] = `<</Type /XObject /Subtype /Image /Width ${im.w} /Height ${im.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${im.bytes.length}>>\nstream\n${bin}\nendstream`; });
    elems.forEach((e: any) => { e.id = alloc(); });
    annots.forEach((a: any, i: any) => { a.id = alloc(); a.key = pages.length + i; });
    outline.forEach((o: any) => { o.id = alloc(); });

    pages.forEach((p: any, i: any) => {
      const stream: any = p.ops.join('\n');
      objs[p.contentId - 1] = `<</Length ${stream.length}>>\nstream\n${stream}\nendstream`;
      objs[p.id - 1] = `<</Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${this.n2(PW)} ${this.n2(PH)}] /Resources <</Font <</F1 ${fontIds[0]} 0 R /F2 ${fontIds[1]} 0 R /F3 ${fontIds[2]} 0 R /F4 ${fontIds[3]} 0 R /F5 ${fontIds[4]} 0 R>>${p.images ? ` /XObject <<${[...p.images].map((im: any) => `/${im.name} ${im.id} 0 R`).join(' ')}>>` : ''}${p.shadings ? ` /Shading <<${p.shadings.map((sh: any) => `/${sh.name} ${sh.id} 0 R`).join(' ')}>>` : ''}>> /Contents ${p.contentId} 0 R /StructParents ${i} /Tabs /S${p.annots.length ? ` /Annots [${p.annots.map((a: any) => `${a.id} 0 R`).join(' ')}]` : ''}>>`;
    });
    annots.forEach((a: any) => {
      objs[a.id - 1] = `<</Type /Annot /Subtype /Link /Rect [${a.rect.map(this.n2).join(' ')}] /Border [0 0 0] /F 4 /StructParent ${a.key} /Contents ${this.hexText(a.text)} /A <</S /URI /URI ${this.hexBytes(this.encode(encodeURI(a.url)))}>>>>`;
    });
    elems.forEach((e: any) => {
      const kids: any = e.kids.map((k: any) => (k.elem ? `${k.elem.id} 0 R` : k.annot ? `<</Type /OBJR /Obj ${k.annot.id} 0 R /Pg ${k.annot.page.id} 0 R>>` : `<</Type /MCR /Pg ${k.page.id} 0 R /MCID ${k.mcid}>>`));
      objs[e.id - 1] = `<</Type /StructElem /S /${e.S} /P ${e.parent ? e.parent.id : structRootId} 0 R${e.page ? ` /Pg ${e.page.id} 0 R` : ''}${e.alt != null ? ` /Alt ${this.hexText(e.alt || ' ')}` : ''}${e.bbox ? ` /A <</O /Layout /BBox [${e.bbox.map(this.n2).join(' ')}]>>` : ''} /K [${kids.join(' ')}]>>`;
    });
    const nums: any = [
      ...pages.map((p: any, i: any) => `${i} [${p.owners.map((e: any) => `${e.id} 0 R`).join(' ')}]`),
      ...annots.map((a: any) => `${a.key} ${a.elem.id} 0 R`),
    ];
    objs[parentTreeId - 1] = `<</Nums [${nums.join(' ')}]>>`;
    objs[structRootId - 1] = `<</Type /StructTreeRoot /K [${doc.id} 0 R] /ParentTree ${parentTreeId} 0 R /ParentTreeNextKey ${pages.length + annots.length}>>`;
    outline.forEach((o: any, i: any) => {
      objs[o.id - 1] = `<</Title ${this.hexText(o.title)} /Parent ${outlinesId} 0 R${i > 0 ? ` /Prev ${outline[i - 1].id} 0 R` : ''}${i < outline.length - 1 ? ` /Next ${outline[i + 1].id} 0 R` : ''} /Dest [${o.page.id} 0 R /XYZ 0 ${this.n2(o.y)} null]>>`;
    });
    objs[outlinesId - 1] = outline.length ? `<</Type /Outlines /First ${outline[0].id} 0 R /Last ${outline[outline.length - 1].id} 0 R /Count ${outline.length}>>` : '<</Type /Outlines /Count 0>>';
    objs[pagesId - 1] = `<</Type /Pages /Kids [${pages.map((p: any) => `${p.id} 0 R`).join(' ')}] /Count ${pages.length}>>`;
    const now: any = new Date();
    const stamp: any = now.toISOString().replace(/[-:T]/g, '').slice(0, 14);
    objs[infoId - 1] = `<</Title ${this.hexText(title)} /Author ${this.hexText(author)} /Subject ${this.hexText(subject)} /Keywords ${this.hexText(keywords)} /Creator ${this.hexText('Sigil CV engine')} /Producer ${this.hexText('Sigil CV engine')} /CreationDate (D:${stamp}Z) /ModDate (D:${stamp}Z)>>`;
    const xmp: any = `<?xpacket begin="" id="W5M0MpCehiHzreSzNTczkc9d"?><x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"><rdf:Description rdf:about="" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:pdf="http://ns.adobe.com/pdf/1.3/" xmlns:xmp="http://ns.adobe.com/xap/1.0/"><dc:title><rdf:Alt><rdf:li xml:lang="x-default">${this.xml(title)}</rdf:li></rdf:Alt></dc:title><dc:creator><rdf:Seq><rdf:li>${this.xml(author)}</rdf:li></rdf:Seq></dc:creator><dc:description><rdf:Alt><rdf:li xml:lang="x-default">${this.xml(subject)}</rdf:li></rdf:Alt></dc:description><dc:language><rdf:Bag><rdf:li>${this.xml(lang)}</rdf:li></rdf:Bag></dc:language><pdf:Keywords>${this.xml(keywords)}</pdf:Keywords><xmp:CreatorTool>Sigil CV engine</xmp:CreatorTool><xmp:CreateDate>${now.toISOString()}</xmp:CreateDate></rdf:Description></rdf:RDF></x:xmpmeta><?xpacket end="w"?>`;
    objs[metaId - 1] = `<</Type /Metadata /Subtype /XML /Length ${xmp.length}>>\nstream\n${xmp}\nendstream`;
    objs[catalogId - 1] = `<</Type /Catalog /Pages ${pagesId} 0 R /Lang (${String(lang).replace(/[^A-Za-z0-9-]/g, '') || 'en'}) /MarkInfo <</Marked true>> /StructTreeRoot ${structRootId} 0 R /ViewerPreferences <</DisplayDocTitle true>> /Metadata ${metaId} 0 R /Outlines ${outlinesId} 0 R /PageMode /UseNone>>`;

    let out: any = '%PDF-1.7\n%âãÏÓ\n';
    const offsets: any = [];
    objs.forEach((body: any, i: any) => { offsets.push(out.length); out += `${i + 1} 0 obj\n${body}\nendobj\n`; });
    const xref: any = out.length;
    out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offsets.map((o: any) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}`;
    out += `trailer\n<</Size ${objs.length + 1} /Root ${catalogId} 0 R /Info ${infoId} 0 R>>\nstartxref\n${xref}\n%%EOF\n`;
    const bytes: any = new Uint8Array(out.length);
    for (let i: any = 0; i < out.length; i++) bytes[i] = out.charCodeAt(i) & 0xff;
    return bytes;
  }
}
