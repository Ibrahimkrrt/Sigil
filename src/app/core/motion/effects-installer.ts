import { Injectable, inject } from '@angular/core';
import { DragScroller } from '../engine/drag-scroller';
import { HiddenInteractions } from '../engine/hidden-interactions';
import { MagneticPull } from '../engine/magnetic-pull';
import { MarqueeRunner } from '../engine/marquee-runner';
import { PilePhysics } from '../engine/pile-physics';
import { PointerCursor } from '../engine/pointer-cursor';
import { ProximityType } from '../engine/proximity-type';
import { ReadingSweep } from '../engine/reading-sweep';
import { TextScrambler } from '../engine/text-scrambler';
import { Translator } from '../i18n/translator';
import { LiveAnnouncer } from '../layout/live-announcer';
import { DitherLayer } from './dither-layer';
import { EffectsHost } from './effects-host';
import { MotionSettings } from './motion-settings';

/**
 * Installs everything that moves on the immersive view once it is rendered: running
 * strips, the reading sweep, label scramble, type that follows the pointer, magnetic
 * controls, draggable strips, the custom pointer, the skill pile and the hidden
 * interactions. Each effect is found by the hook its element carries (`data-scramble`,
 * `data-drag`, `.marquee`…), and all of them are removed together.
 */
@Injectable({ providedIn: 'root' })
export class EffectsInstaller {
  private readonly motion = inject(MotionSettings);
  private readonly translator = inject(Translator);
  private readonly announcer = inject(LiveAnnouncer);
  private readonly dither = inject(DitherLayer);
  private readonly marqueeRunner = inject(MarqueeRunner);
  private readonly readingSweep = inject(ReadingSweep);
  private readonly scrambler = inject(TextScrambler);
  private readonly proximity = inject(ProximityType);
  private readonly magnetic = inject(MagneticPull);
  private readonly dragScroller = inject(DragScroller);
  private readonly cursor = inject(PointerCursor);
  private readonly pilePhysics = inject(PilePhysics);
  private readonly hidden = inject(HiddenInteractions);

  private dropAgain: (() => void) | null = null;
  private holdStrips: ((on: boolean) => void) | null = null;

  /** Install the effects. Returns a function that removes them all. */
  install(host: EffectsHost): () => void {
    const { root, main, model } = host;
    const level = this.motion.level();
    const effects = model.theme.effects;
    const cleanup: (() => void)[] = [];

    const marquees = this.marqueeRunner.runMarquees(main, effects.marquee ? level : 0);
    marquees.pause(this.motion.paused());
    this.holdStrips = (on) => marquees.pause(on);
    const reading = this.readingSweep.wordReveal(main, window, level);

    // Scroll speed, in viewport heights per second, pushes the strips and bends the dither.
    let lastTop = window.scrollY;
    let lastTime = performance.now();
    let queued = false;
    const onScroll = (): void => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        const now = performance.now();
        const velocity = ((window.scrollY - lastTop) / Math.max(1, window.innerHeight)) / Math.max(0.008, (now - lastTime) / 1000);
        lastTop = window.scrollY;
        lastTime = now;
        this.dither.push(velocity * 0.22);
        marquees.push(velocity * 0.3);
        reading.update();
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });

    const eggsRef: { launch?: (info: unknown) => void } = {};
    const pile = this.installPile(main, root, level, (info) => eggsRef.launch?.(info), cleanup);
    const eggs = this.hidden.installEggs({
      root, main, model, pile,
      pileBox: main.querySelector('.pile[data-live]'),
      announce: (message: string) => this.announcer.say(message),
      goTo: host.goTo,
      motion: level,
    });
    eggsRef.launch = eggs.launch;

    // The journey strip only says "drag" when there is something to drag to.
    const tracks = [...main.querySelectorAll<HTMLElement>('.track')];
    const markTracks = (): void => {
      for (const track of tracks) {
        const scrolls = track.scrollWidth > track.clientWidth + 1;
        track.classList.toggle('is-scroll', scrolls);
        if (scrolls) track.dataset['cursor'] = this.translator.t('Drag');
        else delete track.dataset['cursor'];
      }
    };
    const trackObserver = new ResizeObserver(() => requestAnimationFrame(markTracks));
    trackObserver.observe(root);
    markTracks();

    cleanup.push(
      () => window.removeEventListener('scroll', onScroll),
      () => trackObserver.disconnect(),
      marquees.destroy,
      eggs.destroy,
      this.scrambler.watchScramble(root, level),
      this.proximity.proximityType(main, level),
      effects.magnetic ? this.magnetic.magnetic(root, level) : () => undefined,
      this.dragScroller.dragScroll(main),
      effects.cursor ? this.cursor.customCursor(root, level) : () => undefined,
    );
    return () => {
      this.dropAgain = null;
      this.holdStrips = null;
      for (const dispose of cleanup) {
        try {
          dispose();
        } catch {
          // One effect failing to clean up must not keep the others installed.
        }
      }
    };
  }

  /** Let the skill pile fall again. */
  dropPile(): void {
    this.dropAgain?.();
  }

  /** Hold or release everything that moves on its own. */
  pause(on: boolean): void {
    this.holdStrips?.(on);
    this.dither.pause(on);
  }

  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  private installPile(main: HTMLElement, root: HTMLElement, level: number, onLaunch: (info: unknown) => void, cleanup: (() => void)[]): any {
    // The pile is installed whenever it is offered, even while the reader is looking at the list instead.
    const box = main.querySelector<HTMLElement>('.pile[data-live]');
    if (!box) return null;
    // Give the pile enough room for its bricks at this width, so a narrow screen stacks instead of overflowing.
    const area = [...box.querySelectorAll<HTMLElement>('li')].reduce((sum, li) => sum + (li.offsetWidth + 14) * (li.offsetHeight + 12), 0);
    if (box.clientWidth) box.style.setProperty('--pile-h', `${Math.round(Math.min((area / box.clientWidth) * 1.35 + 110, window.innerHeight * 0.86))}px`);

    const note = document.createElement('p');
    note.className = 'pile__note';
    note.hidden = true;
    box.append(note);
    let teaseTimer = 0;
    // Someone doing their best to flip a brick upside down gets a wink.
    const tease = (): void => {
      const message = this.translator.t("Stop trying, it won't flip ;)");
      const label = root.querySelector('.cursor__label');
      box.dataset['cursor'] = message;
      if (label) label.textContent = message;
      note.textContent = message;
      note.hidden = false;
      this.announcer.say(message);
      clearTimeout(teaseTimer);
      teaseTimer = window.setTimeout(() => {
        box.dataset['cursor'] = this.translator.t('Drag');
        if (label && label.textContent === message) label.textContent = this.translator.t('Drag');
        note.hidden = true;
      }, 3200);
    };
    const pile = this.pilePhysics.physicsPile(box, level, { onFlipAttempt: tease, onLaunch });
    this.dropAgain = () => pile.drop();
    cleanup.push(() => clearTimeout(teaseTimer), () => note.remove(), pile.destroy);
    return pile;
  }
}
