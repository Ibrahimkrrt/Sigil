import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { Signature } from '@core/signature/signature';
import { Translator } from '@core/i18n/translator';
import { CvChapter } from '@domain/models/cv-chapter';
import { CvModel } from '@domain/models/cv-model';
import { CvPicture } from '../../atoms/cv-picture/cv-picture';
import { PatternTile } from '../../atoms/pattern-tile/pattern-tile';
import { RichText } from '../../atoms/rich-text/rich-text';
import { SigilMark } from '../../atoms/sigil-mark/sigil-mark';
import { SplitChars } from '../../atoms/split-chars/split-chars';
import { FitTextDirective } from '../../directives/fit-text.directive';
import { MarqueeStrip } from '../../molecules/marquee-strip/marquee-strip';
import { TranslatePipe } from '../../pipes/translate.pipe';

/** The opening: the name as a poster, the portrait, one line of intent, and the way in. */
@Component({
  selector: 'sg-hero-chapter',
  imports: [CvPicture, PatternTile, RichText, SigilMark, SplitChars, FitTextDirective, MarqueeStrip, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'hero', '[class]': '"hero--" + model().theme.layout.hero' },
  templateUrl: './hero-chapter.html',
})
export class HeroChapter {
  private readonly signature = inject(Signature);
  private readonly translator = inject(Translator);
  readonly chapter = input.required<CvChapter>();
  readonly model = input.required<CvModel>();
  /** The id of the chapter that follows, for the "begin" link. */
  readonly nextId = input<string | null>(null);

  protected readonly backdrop = computed(() => this.signature.shuffle(this.model().theme.seed, ['flow', 'waves', 'contours', 'blobs'], 'opening')[0]);
  protected readonly meta = computed(() => {
    const model = this.model();
    this.translator.lang();
    const years = model.careerYears >= 2 ? this.translator.t('{n} years in practice', { n: model.careerYears }) : '';
    return [model.profile.location, years].filter(Boolean);
  });
  /** Roles and leading skills, for the running strip. */
  protected readonly strip = computed(() => {
    const model = this.model();
    return [
      ...model.positions.filter((position) => position.kind === 'role').map((position) => position.name),
      ...model.skills.technical.slice(0, 10).map((skill) => skill.name),
    ];
  });
}
