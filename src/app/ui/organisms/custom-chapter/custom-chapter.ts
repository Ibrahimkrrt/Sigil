import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CvChapter } from '@domain/models/cv-chapter';
import { RichText } from '../../atoms/rich-text/rich-text';
import { RevealDirective } from '../../directives/reveal.directive';
import { ChapterHeader } from '../../molecules/chapter-header/chapter-header';
import { ContentBlock } from '../content-block/content-block';

/** A section the CV defines itself: a title, a lead text and any number of content blocks. */
@Component({
  selector: 'sg-custom-chapter',
  imports: [ChapterHeader, RichText, RevealDirective, ContentBlock],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'sg-contents' },
  template: `
    @if (chapter().title) {
      <header sgChapterHeader [chapter]="chapter()" [index]="index()"></header>
    }
    @if (chapter().text) {
      <p class="prose prose--lead" sgReveal><sg-rich-text [text]="chapter().text" /></p>
    }
    <div class="blocks">
      @for (block of chapter().blocks; track $index) {
        <sg-content-block [block]="block" [seed]="chapter().id" />
      }
    </div>
  `,
})
export class CustomChapter {
  readonly chapter = input.required<CvChapter>();
  readonly index = input.required<number>();
}
