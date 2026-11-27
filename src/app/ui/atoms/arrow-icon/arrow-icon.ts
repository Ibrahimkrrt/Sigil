import { ChangeDetectionStrategy, Component } from '@angular/core';

/** A small right-pointing arrow, drawn in the current text colour. */
@Component({
  selector: 'svg[sgArrowIcon]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ico', viewBox: '0 0 16 16', width: '16', height: '16', 'aria-hidden': 'true' },
  template: `<svg:path d="M3 8h10M9 4l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="square" />`,
})
export class ArrowIcon {}
