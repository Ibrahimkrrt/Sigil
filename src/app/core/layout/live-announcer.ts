import { Injectable, signal } from '@angular/core';

/** Messages for screen-reader users: things that happened on the page without moving focus. */
@Injectable({ providedIn: 'root' })
export class LiveAnnouncer {
  private readonly current = signal('');
  private timer: ReturnType<typeof setTimeout> | undefined;

  /** The latest message. Render it in a polite live region. */
  readonly message = this.current.asReadonly();

  say(message: string): void {
    // Cleared first, so saying the same thing twice is announced twice.
    this.current.set('');
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.current.set(message), 60);
  }
}
