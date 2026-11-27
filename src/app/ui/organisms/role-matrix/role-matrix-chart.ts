import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RoleMatrix } from '@core/journey/role-matrix';
import { RevealDirective } from '../../directives/reveal.directive';
import { TranslatePipe } from '../../pipes/translate.pipe';

/** Roles over the years, as a chart. The same information is given to assistive technology as one description. */
@Component({
  selector: 'figure[sgRoleMatrixChart]',
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  hostDirectives: [RevealDirective],
  host: { class: 'matrix' },
  templateUrl: './role-matrix-chart.html',
})
export class RoleMatrixChart {
  readonly matrix = input.required<RoleMatrix>();
}
