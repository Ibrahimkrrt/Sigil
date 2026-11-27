import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CvChapter } from '@domain/models/cv-chapter';
import { RichText } from '../../atoms/rich-text/rich-text';

/** The head of a chapter: its number and short name, its title, and an optional introduction. Extras are projected in. */
@Component({
  selector: 'header[sgChapterHeader]',
  imports: [RichText],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ch__head' },
  template: `
    <p class="ch__idx" aria-hidden="true">{{ number() }} / {{ chapter().nav }}</p>
    <h2 class="ch__title" [id]="chapter().id + '-title'" tabindex="-1"><sg-rich-text [text]="chapter().title" ink /></h2>
    @if (chapter().intro) {
      <p class="ch__intro"><sg-rich-text [text]="chapter().intro" /></p>
    }
    <ng-content />
  `,
})
export class ChapterHeader {
  readonly chapter = input.required<CvChapter>();
  /** The chapter's position on the page, counted from zero at the opening. */
  readonly index = input.required<number>();
  protected readonly number = computed(() => String(this.index()).padStart(2, '0'));
}
