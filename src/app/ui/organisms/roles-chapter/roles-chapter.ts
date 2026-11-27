import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, inject, input, signal, viewChildren } from '@angular/core';
import { DateFormatter } from '@core/format/date-formatter';
import { Translator } from '@core/i18n/translator';
import { RoleMatrixBuilder } from '@core/journey/role-matrix-builder';
import { RoleFocus } from '@core/layout/role-focus';
import { MotionSettings } from '@core/motion/motion-settings';
import { Signature } from '@core/signature/signature';
import { CvChapter } from '@domain/models/cv-chapter';
import { CvEngagement } from '@domain/models/cv-engagement';
import { CvModel } from '@domain/models/cv-model';
import { CvPosition } from '@domain/models/cv-position';
import { PatternTile } from '../../atoms/pattern-tile/pattern-tile';
import { RichText } from '../../atoms/rich-text/rich-text';
import { ChapterHeader } from '../../molecules/chapter-header/chapter-header';
import { SplitBar } from '../../molecules/split-bar/split-bar';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { RoleMatrixChart } from '../role-matrix/role-matrix-chart';

/**
 * Roles taken: the roles over the years, then an index of roles, each opening into a
 * deep dive: where it was held, and the missions carried out in that role there.
 */
@Component({
  selector: 'sg-roles-chapter',
  imports: [ChapterHeader, RoleMatrixChart, PatternTile, RichText, SplitBar, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'sg-contents' },
  templateUrl: './roles-chapter.html',
})
export class RolesChapter {
  private readonly matrixBuilder = inject(RoleMatrixBuilder);
  private readonly signature = inject(Signature);
  private readonly dates = inject(DateFormatter);
  private readonly translator = inject(Translator);
  private readonly motion = inject(MotionSettings);
  private readonly focus = inject(RoleFocus);

  readonly chapter = input.required<CvChapter>();
  readonly index = input.required<number>();
  readonly model = input.required<CvModel>();

  protected readonly roles = computed(() => this.model().positions.filter((position) => position.kind === 'role'));
  protected readonly matrix = computed(() => {
    this.translator.lang();
    return this.matrixBuilder.build(this.roles(), this.model().experience);
  });
  /** Each role gets its own moving pattern, in this CV's own order, so no two neighbours share one. */
  protected readonly banners = computed(() => this.signature.shuffle(this.model().theme.seed, ['contours', 'bars', 'blobs', 'rings', 'waves', 'flow'], 'banners'));
  /** The index of the open role, or -1 when all are closed. The first role starts open. */
  protected readonly openIndex = signal(0);
  private readonly rows = viewChildren<ElementRef<HTMLElement>>('row');

  constructor() {
    // A "deep dive" link elsewhere on the page opens its role here and brings it into view.
    effect(() => {
      const request = this.focus.request();
      const index = request ? this.roles().findIndex((role) => role.id === request.id) : -1;
      if (index < 0) return;
      this.openIndex.set(index);
      const row = this.rows()[index]?.nativeElement;
      // After the link's own jump to the chapter has happened.
      setTimeout(() => {
        row?.scrollIntoView({ block: 'start', behavior: this.motion.enabled() ? 'smooth' : 'auto' });
        row?.querySelector('button')?.focus({ preventScroll: true });
      });
    });
  }

  protected toggle(index: number): void {
    this.openIndex.update((open) => (open === index ? -1 : index));
  }

  protected period(item: CvPosition | CvEngagement): string {
    return this.dates.range(item.start, item.current ? '' : item.end);
  }

  protected companies(role: CvPosition): string {
    return role.engagements.map((engagement) => engagement.name).join(' · ');
  }

  protected engagementMeta(engagement: CvEngagement): string {
    const via = engagement.via ? this.translator.t('via {name}', { name: engagement.via }) : '';
    return [this.period(engagement), via].filter(Boolean).join(' · ');
  }

  /** The names of the role parts one mission belongs to. */
  protected missionTags(role: CvPosition, engagement: CvEngagement, missionIndex: number): string[] {
    const own = engagement.missionParts[missionIndex] ?? [];
    return role.parts.filter((part) => own.includes(part.id)).map((part) => part.name);
  }
}
