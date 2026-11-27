import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { BlockReader } from '@core/blocks/block-reader';
import { ChartLayoutBuilder } from '@core/blocks/chart-layout-builder';
import { Translator } from '@core/i18n/translator';
import { LooseRecord } from '@domain/models/loose-record';
import { asText } from '@domain/read/as-text';
import { ArrowIcon } from '../../atoms/arrow-icon/arrow-icon';
import { CvPicture } from '../../atoms/cv-picture/cv-picture';
import { ExternalLink } from '../../atoms/external-link/external-link';
import { RichText } from '../../atoms/rich-text/rich-text';
import { RevealDirective } from '../../directives/reveal.directive';
import { DataChart } from '../../molecules/data-chart/data-chart';
import { StatList } from '../../molecules/stat-list/stat-list';
import { TimelineList } from '../../molecules/timeline-list/timeline-list';
import { VizField } from '../../molecules/viz-field/viz-field';
import { TranslatePipe } from '../../pipes/translate.pipe';

/**
 * One content block of a custom section. Unknown types fall back to their title and
 * text, so a newer CV file never breaks an older page.
 */
@Component({
  selector: 'sg-content-block',
  imports: [ArrowIcon, CvPicture, ExternalLink, RichText, RevealDirective, DataChart, StatList, TimelineList, VizField, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'sg-contents' },
  templateUrl: './content-block.html',
})
export class ContentBlock {
  protected readonly read = inject(BlockReader);
  private readonly charts = inject(ChartLayoutBuilder);
  private readonly translator = inject(Translator);
  readonly block = input.required<LooseRecord>();
  /** A seed for generated visuals, unique to the section. */
  readonly seed = input('');

  protected readonly type = computed(() => asText(this.block()['type']));
  protected readonly chart = computed(() => {
    this.translator.lang();
    return this.type() === 'chart' ? this.charts.build(this.block()) : null;
  });

  /** A text field of the block. */
  protected text(key: string): string {
    return asText(this.block()[key]);
  }
}
