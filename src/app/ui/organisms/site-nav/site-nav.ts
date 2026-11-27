import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, afterNextRender, computed, inject, input, model, signal, viewChild } from '@angular/core';
import { Translator } from '@core/i18n/translator';
import { LiveAnnouncer } from '@core/layout/live-announcer';
import { MotionSettings } from '@core/motion/motion-settings';
import { SigilMark } from '../../atoms/sigil-mark/sigil-mark';
import { SegmentOption } from '../../molecules/segmented-control/segment-option';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { NavLink } from './nav-link';

/**
 * The bar at the top of the page: the signature mark and name, the chapter in view,
 * the chapter links, the language and view switches, and the pause control.
 * When the links do not fit on one line they move into a full-screen menu.
 */
@Component({
  selector: 'header[sgSiteNav]',
  imports: [SigilMark, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'nav', '[class.is-compact]': 'compact()', '[class.is-open]': 'open()', '(keydown.escape)': 'closeMenu(true)' },
  templateUrl: './site-nav.html',
})
export class SiteNav {
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly translator = inject(Translator);
  protected readonly motion = inject(MotionSettings);
  private readonly announcer = inject(LiveAnnouncer);

  readonly name = input.required<string>();
  readonly seed = input.required<string>();
  /** The id the brand links back to: the first chapter. */
  readonly topId = input.required<string>();
  readonly links = input.required<readonly NavLink[]>();
  /** The id of the link to mark as current. */
  readonly currentId = input<string | null>(null);
  /** A short label for the chapter in view: "03 Journey". */
  readonly now = input('');
  /** Scroll progress from 0 to 1, or null to hide the progress line. */
  readonly progress = input<number | null>(null);
  readonly languages = input.required<readonly SegmentOption[]>();
  readonly lang = model.required<string>();
  readonly mode = model.required<string>();
  /** Show the pause control: only when something on the page moves on its own. */
  readonly pausable = input(false);

  protected readonly compact = signal(false);
  protected readonly open = signal(false);
  protected readonly modes = computed<SegmentOption[]>(() => {
    this.translator.lang();
    return [
      { value: 'immersive', label: this.translator.t('Immersive') },
      { value: 'recruiter', label: this.translator.t('Recruiter') },
    ];
  });
  private readonly list = viewChild.required<ElementRef<HTMLElement>>('list');
  private readonly menuButton = viewChild.required<ElementRef<HTMLButtonElement>>('menu');

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      // Measured on the next frame: changing layout inside the observer's own callback would make it loop.
      const refit = (): void => this.measure();
      const observer = new ResizeObserver(() => requestAnimationFrame(refit));
      // The page is what resizes; the bar itself changes size when its menu opens, which must not count.
      observer.observe(this.element.nativeElement.closest('.scv') ?? this.element.nativeElement);
      document.fonts?.addEventListener?.('loadingdone', refit);
      void document.fonts?.ready.then(() => this.measure());
      destroyRef.onDestroy(() => {
        observer.disconnect();
        document.fonts?.removeEventListener?.('loadingdone', refit);
      });
    });
  }

  protected toggleMenu(): void {
    this.open.update((open) => !open);
  }

  protected closeMenu(refocus = false): void {
    if (!this.open()) return;
    this.open.set(false);
    if (refocus) this.menuButton().nativeElement.focus();
  }

  protected togglePause(): void {
    this.motion.pause(!this.motion.paused());
    this.announcer.say(this.translator.t(this.motion.paused() ? 'Motion paused.' : 'Motion playing.'));
  }

  /** Measure again, after something outside the bar changed what it shows. */
  refit(): void {
    requestAnimationFrame(() => this.measure());
  }

  /** The links stay in the bar while they fit on one line; otherwise they move into the menu. */
  private measure(): void {
    const nav = this.element.nativeElement;
    const list = this.list().nativeElement;
    nav.classList.remove('is-compact');
    const overflows = list.scrollWidth > (list.parentElement?.clientWidth ?? 0) + 1 || nav.scrollWidth > nav.clientWidth + 1;
    nav.classList.toggle('is-compact', overflows);
    this.compact.set(overflows);
    if (!overflows) this.open.set(false);
  }
}
