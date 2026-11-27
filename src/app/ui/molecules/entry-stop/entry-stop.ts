import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CvExperience } from '@domain/models/cv-experience';
import { RichText } from '../../atoms/rich-text/rich-text';
import { DateRangePipe } from '../../pipes/date-range.pipe';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { ChipList } from '../chip-list/chip-list';
import { Tile } from '../tile-list/tile';
import { TileList } from '../tile-list/tile-list';

/** One stop of the journey when the CV has no roles: one experience entry. */
@Component({
  selector: 'li[sgEntryStop]',
  imports: [RichText, ChipList, TileList, DateRangePipe, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'stop', 'data-hover': '' },
  template: `
    <p class="stop__when"><span class="stop__n" aria-hidden="true">{{ number() }}</span>{{ entry().start | dateRange: (entry().current ? '' : entry().end) }}</p>
    <!-- The stop is the position: the title leads, the company (which may repeat) sits under it. -->
    <h3 class="stop__title">{{ entry().role || entry().company }}</h3>
    @if ((entry().role && entry().company) || entry().location) {
      <p class="stop__role">
        @if (entry().role && entry().company) {
          <span class="stop__co">{{ entry().company }}</span>
        }
        {{ entry().role && entry().company && entry().location ? ' · ' : '' }}{{ entry().location }}
      </p>
    }
    @if (entry().summary) {
      <p class="stop__text"><sg-rich-text [text]="entry().summary" /></p>
    }
    @if (tiles().length) {
      <dl sgTileList [tiles]="tiles()"></dl>
    }
    @if (entry().highlights.length) {
      <details class="more">
        <summary data-scramble><span data-scramble-text>{{ (entry().highlights.length === 1 ? '{n} mission' : '{n} missions') | t: { n: entry().highlights.length } }}</span></summary>
        <ul class="bases">
          @for (line of entry().highlights; track $index) {
            <li><sg-rich-text [text]="line" /></li>
          }
        </ul>
      </details>
    }
    @if (entry().organisations.length > 1) {
      <p class="stop__clients">{{ 'Clients: {names}' | t: { names: clients() } }}</p>
    }
    @if (entry().tags.length) {
      <ul sgChipList [items]="entry().tags" variant="chips--mono"></ul>
    }
  `,
})
export class EntryStop {
  readonly entry = input.required<CvExperience>();
  readonly order = input.required<number>();
  protected readonly number = computed(() => String(this.order()).padStart(2, '0'));
  protected readonly tiles = computed<Tile[]>(() => this.entry().stats.map((stat) => ({ label: stat.label, value: stat.value })));
  protected readonly clients = computed(() => this.entry().organisations.map((organisation) => organisation.name).join(', '));
}
