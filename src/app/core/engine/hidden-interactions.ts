import { Injectable, inject } from '@angular/core';
import { DomBuilder } from './dom-builder';
import { Translator } from '../i18n/translator';
import { Signature } from '../signature/signature';
import { MoonFilm } from './moon-film';

/**
 * The hidden interactions: the moon launch, zero gravity, typed words, the signature's
 * secret and a note in the console.
 * Lifted from the reference engine; values are loosely typed inside.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
@Injectable({ providedIn: 'root' })
export class HiddenInteractions {
  private readonly dom = inject(DomBuilder);
  private readonly h = (tag: string, attrs?: any, ...kids: any[]): any => this.dom.h(tag, attrs, ...kids);
  private readonly translator = inject(Translator);
  private readonly t = (source: string, vars?: Record<string, string | number>): string => this.translator.t(source, vars);
  private readonly signature = inject(Signature);
  private readonly film = inject(MoonFilm);

  private KONAMI: any = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];

  /** The fallback moon scene (no WebGL), played inside the pile's own frame. Returns when it has closed. */
  private moonshot(box: any, { label, className, from }: any, motion: any): any {
    const pill: any = this.h('span', { class: `${className} moon__pill` }, label);
    const caption: any = this.h('p', { class: 'moon__caption' }, this.t('Lift-off'));
    const flag: any = this.h('span', { class: 'moon__flag' });
    const scene: any = this.h('div', { class: 'moon', 'aria-hidden': 'true' },
      this.h('span', { class: 'moon__stars' }), this.h('span', { class: 'moon__earth' }),
      this.h('span', { class: 'moon__moon' }, this.h('i', {}), this.h('i', {}), this.h('i', {}), flag),
      this.h('span', { class: 'moon__trail' }), pill, caption);
    scene.style.setProperty('--fx', `${(from[0] * 100).toFixed(1)}%`);
    scene.style.setProperty('--fy', `${(from[1] * 100).toFixed(1)}%`);
    box.append(scene);
    return new Promise((resolve: any) => {
      const timers: any = [
        setTimeout(() => { scene.classList.add('is-landed'); caption.textContent = this.t('{skill} has landed', { skill: label }); }, 1500),
        // Two seconds on the moon, then back to the pile.
        setTimeout(() => scene.classList.add('is-leaving'), 3500),
        setTimeout(() => { scene.remove(); resolve(); }, 3500 + (motion > 0 ? 450 : 0)),
      ];
      scene._stop = () => { timers.forEach(clearTimeout); scene.remove(); resolve(); };
    });
  }

  installEggs({ root, main, model, pile, pileBox, announce, goTo, motion }: any): any {
    if (motion <= 0) return { launch() {}, destroy() {} };
    const cleanup: any = [];
    const toastEl: any = this.h('p', { class: 'egg', 'aria-hidden': 'true', hidden: true });
    root.append(toastEl);
    let toastTimer: any = 0;
    const toast: any = (msg: any, ms: any = 3200) => { toastEl.textContent = msg; toastEl.hidden = false; announce(msg); clearTimeout(toastTimer); toastTimer = setTimeout(() => { toastEl.hidden = true; }, ms); };
    cleanup.push(() => { clearTimeout(toastTimer); toastEl.remove(); });

    // ---- To the moon
    const launch: any = async (info: any) => {
      announce(this.t('{skill} left for the moon.', { skill: info.label }));
      // The film takes the whole screen; without WebGL a small scene plays inside the pile instead.
      let film: any = null;
      try { film = this.film.playMoonshot.bind(this.film)(root, info, { accent: getComputedStyle(root).getPropertyValue('--accent') || '#ff4a1c', code: model.theme.code }); } catch { film = null; }
      await (film || this.moonshot(pileBox, info, motion));
      info.back(1100);
    };
    cleanup.push(() => { pileBox?.querySelector('.moon')?._stop?.(); root.querySelector('.launch')?.remove(); });

    // ---- Keys: the Konami code and a few typed words
    let keys: any = [], typed: any = '';
    const onKey: any = (e: any) => {
      if (e.ctrlKey || e.metaKey || e.altKey || root.dataset.mode !== 'immersive') return;
      const el: any = e.target;
      if (el && (el.isContentEditable || /^(input|textarea|select)$/i.test(el.tagName))) return;
      keys = [...keys, e.key.length === 1 ? e.key.toLowerCase() : e.key].slice(-this.KONAMI.length);
      if (keys.join() === this.KONAMI.join()) {
        keys = [];
        if (pile?.float && pileBox && !pileBox.hidden) { pile.float(6500); pileBox.scrollIntoView({ block: 'center', behavior: 'smooth' }); toast(this.t('Cheat enabled: zero gravity.')); } else toast(this.t('Cheat accepted. Nothing to float here.'));
        return;
      }
      if (e.key.length !== 1) return;
      typed = (typed + e.key.toLowerCase()).slice(-8);
      if (typed.endsWith('sudo')) { typed = ''; toast(this.t('Permission denied. This incident will be reported ;)')); }
      else if (typed.endsWith('hire')) { typed = ''; const id: any = main.querySelector('.ch--contact')?.id; if (id) goTo(id); toast(this.t('Good call. Contact is right here.')); }
      else if (typed.endsWith('moon')) { typed = ''; if (pile?.launchAny && pileBox && !pileBox.hidden) { pileBox.scrollIntoView({ block: 'center', behavior: 'smooth' }); setTimeout(() => pile.launchAny(), 500); } }
    };
    window.addEventListener('keydown', onKey);
    cleanup.push(() => window.removeEventListener('keydown', onKey));

    // ---- The signature mark refuses to be anyone else
    const mark: any = root.querySelector('.nav__sigil path');
    if (mark) {
      // The mark's own shape is read when the glitch starts, never earlier: the page may have redrawn it since.
      let clicks: any = [], glitch: any = 0, own: any = null;
      const onClick: any = () => {
        const now: any = performance.now();
        clicks = [...clicks.filter((c: any) => now - c < 2500), now];
        if (clicks.length < 5 || glitch) return;
        clicks = [];
        let n: any = 0;
        own = mark.getAttribute('d');
        glitch = setInterval(() => {
          mark.setAttribute('d', this.signature.path.bind(this.signature)(`${Math.random()}`));
          if (++n > 18) { clearInterval(glitch); glitch = 0; mark.setAttribute('d', own); toast(this.t('SIG {code}. One of one, it always comes back.', { code: model.theme.code })); }
        }, 70);
      };
      const brand: any = mark.closest('a');
      brand.addEventListener('click', onClick);
      cleanup.push(() => { brand.removeEventListener('click', onClick); if (glitch) { clearInterval(glitch); glitch = 0; mark.setAttribute('d', own); } });
    }

    // ---- A note in the console, for whoever opens it
    try {
      console.log(`%c SIG ${model.theme.code} %c ${model.profile.name}`, 'background:#ff4a1c;color:#0b0b0d;font-weight:700;padding:2px 4px', 'font-weight:700');
      console.log('Reading the source? Good. The Angular edition: signals, standalone components, and underneath them a WebGL dither shader, a rigid-body solver for the skill pile and a hand-written PDF writer.\nThere are a few hidden things on this page. Try throwing a skill really hard.');
    } catch { /* console unavailable */ }

    return { launch, destroy() { cleanup.forEach((fn: any) => { try { fn(); } catch { /* ignore */ } }); } };
  }
}
