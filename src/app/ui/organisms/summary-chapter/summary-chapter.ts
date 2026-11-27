import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CvChapter } from '@domain/models/cv-chapter';
import { CvProfile } from '@domain/models/cv-profile';
import { plainText } from '@domain/text/plain-text';
import { RichText } from '../../atoms/rich-text/rich-text';
import { RevealDirective } from '../../directives/reveal.directive';
import { ChapterHeader } from '../../molecules/chapter-header/chapter-header';
import { SummaryWord } from './summary-word';

/** The story: one large statement, the rest of the summary, key facts and a quote. */
@Component({
  selector: 'sg-summary-chapter',
  imports: [ChapterHeader, RichText, RevealDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'sg-contents' },
  templateUrl: './summary-chapter.html',
})
export class SummaryChapter {
  readonly chapter = input.required<CvChapter>();
  readonly index = input.required<number>();
  readonly profile = input.required<CvProfile>();

  /** The first paragraph, word by word (bold kept), so reading can be followed on scroll. */
  protected readonly statement = computed<SummaryWord[]>(() => {
    const first = this.profile().summary[0] ?? '';
    return first.split(/(\*\*[^*]+\*\*)/).flatMap((part) => {
      const bold = part.startsWith('**');
      return (bold ? part.slice(2, -2) : plainText(part)).split(/\s+/).filter(Boolean).map((text) => ({ text, bold }));
    });
  });
  protected readonly rest = computed(() => this.profile().summary.slice(1));
}
