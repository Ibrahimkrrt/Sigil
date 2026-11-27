import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { Signature } from '@core/signature/signature';

/** The signature mark: a glyph grown from the CV's seed. Decorative; the name beside it carries the meaning. */
@Component({
  selector: 'svg[sgSigilMark]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'sigil', viewBox: '-1 -1 9 9', 'aria-hidden': 'true', 'shape-rendering': 'crispEdges' },
  template: `<svg:path [attr.d]="path()" />`,
})
export class SigilMark {
  private readonly signature = inject(Signature);
  readonly seed = input.required<string>();
  protected readonly path = computed(() => this.signature.path(this.seed()));
}
