import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ChartLayout } from '@core/blocks/chart-layout';
import { RevealDirective } from '../../directives/reveal.directive';
import { TranslatePipe } from '../../pipes/translate.pipe';

/** A bar or line chart, with the same data as a table the reader can open. */
@Component({
  selector: 'figure[sgDataChart]',
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  hostDirectives: [RevealDirective],
  host: { class: 'chart' },
  templateUrl: './data-chart.html',
})
export class DataChart {
  readonly chart = input.required<ChartLayout>();
  protected readonly max = Math.max;
}
