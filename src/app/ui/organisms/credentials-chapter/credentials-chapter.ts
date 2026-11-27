import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { DateFormatter } from '@core/format/date-formatter';
import { CvChapter } from '@domain/models/cv-chapter';
import { CvEducation } from '@domain/models/cv-education';
import { CvModel } from '@domain/models/cv-model';
import { ChapterHeader } from '../../molecules/chapter-header/chapter-header';
import { InfoRow } from '../../molecules/info-row/info-row';
import { TranslatePipe } from '../../pipes/translate.pipe';

/** Education and certifications, side by side. */
@Component({
  selector: 'sg-credentials-chapter',
  imports: [ChapterHeader, InfoRow, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'sg-contents' },
  template: `
    <header sgChapterHeader [chapter]="chapter()" [index]="index()"></header>
    <div class="cols cols--even">
      @if (model().education.length) {
        <div>
          <h3 class="sub">{{ 'Education' | t }}</h3>
          <ul class="rows">
            @for (entry of model().education; track $index) {
              <li sgInfoRow [heading]="entry.degree || entry.school" [sub]="entry.degree ? entry.school : ''" [when]="when(entry)" [detail]="entry.detail"></li>
            }
          </ul>
        </div>
      }
      @if (model().certifications.length) {
        <div>
          <h3 class="sub">{{ 'Certifications' | t }}</h3>
          <ul class="rows">
            @for (item of model().certifications; track $index) {
              <li sgInfoRow [heading]="item.title" [sub]="item.issuer" [when]="item.year"></li>
            }
          </ul>
        </div>
      }
    </div>
  `,
})
export class CredentialsChapter {
  private readonly dates = inject(DateFormatter);
  readonly chapter = input.required<CvChapter>();
  readonly index = input.required<number>();
  readonly model = input.required<CvModel>();

  protected when(entry: CvEducation): string {
    return this.dates.range(entry.start, entry.end, false, '') || entry.end;
  }
}
