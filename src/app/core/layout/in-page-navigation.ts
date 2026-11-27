import { Injectable, inject } from '@angular/core';
import { MotionSettings } from '../motion/motion-settings';

/**
 * Moves around inside the page. An in-page link scrolls to its target and moves focus
 * there too, so it works for keyboard and screen-reader users, not only for the eye.
 */
@Injectable({ providedIn: 'root' })
export class InPageNavigation {
  private readonly motion = inject(MotionSettings);

  /** Scroll to the element with this id inside `root` and focus its heading. Returns false when there is none. */
  goTo(root: HTMLElement, id: string, smooth = true): boolean {
    const target = root.querySelector<HTMLElement>(`#${CSS.escape(id)}`);
    if (!target) return false;
    target.scrollIntoView({ behavior: smooth && this.motion.enabled() ? 'smooth' : 'auto', block: 'start' });
    this.focus(target.matches('h1, h2') ? target : (target.querySelector<HTMLElement>('h1, h2') ?? target));
    return true;
  }

  /** Move focus to an element without scrolling, making it focusable if it is not. */
  focus(element: HTMLElement | null): void {
    if (!element) return;
    if (!element.hasAttribute('tabindex')) element.setAttribute('tabindex', '-1');
    element.focus({ preventScroll: true });
  }

  /** The id an in-page link points at, when the click was on one inside `root`. */
  targetOf(event: Event, root: HTMLElement): string | null {
    const link = (event.target as Element | null)?.closest?.('a[href^="#"]');
    if (!link || !root.contains(link)) return null;
    return decodeURIComponent((link.getAttribute('href') ?? '').slice(1)) || null;
  }

  /** Record where the reader is in the address bar, without adding to the history. */
  remember(hash: string): void {
    try {
      history.replaceState(null, '', hash ? `#${hash}` : location.pathname + location.search);
    } catch {
      // The page is sandboxed: the address simply stays as it is.
    }
  }
}
