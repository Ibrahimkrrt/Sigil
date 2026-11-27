import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** A decorative running strip of words. The same words appear as real content elsewhere on the page. */
@Component({
  selector: 'sg-marquee-strip',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'marquee', 'aria-hidden': 'true' },
  template: `
    <div class="marquee__track">
      @for (run of [0, 1]; track run) {
        @for (item of items(); track $index) {
          <span class="marquee__item">{{ item }}<i class="marquee__sep"></i></span>
        }
      }
    </div>
  `,
})
export class MarqueeStrip {
  readonly items = input.required<readonly string[]>();
}
