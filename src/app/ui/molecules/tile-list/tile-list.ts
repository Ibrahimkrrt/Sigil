import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RichText } from '../../atoms/rich-text/rich-text';
import { Tile } from './tile';

/** A row of small figures: years, companies, missions. */
@Component({
  selector: 'dl[sgTileList]',
  imports: [RichText],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'tiles' },
  template: `
    @for (tile of tiles(); track $index) {
      <div class="tile">
        <dt><sg-rich-text [text]="tile.label" /></dt>
        <dd>{{ tile.value }}</dd>
      </div>
    }
  `,
})
export class TileList {
  readonly tiles = input.required<readonly Tile[]>();
}
