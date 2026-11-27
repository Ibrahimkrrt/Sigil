import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { Translator } from '@core/i18n/translator';
import { PositionYears } from '@core/journey/position-years';
import { RoleFocus } from '@core/layout/role-focus';
import { CvPosition } from '@domain/models/cv-position';
import { ArrowIcon } from '../../atoms/arrow-icon/arrow-icon';
import { RichText } from '../../atoms/rich-text/rich-text';
import { DateRangePipe } from '../../pipes/date-range.pipe';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { SplitBar } from '../split-bar/split-bar';
import { Tile } from '../tile-list/tile';
import { TileList } from '../tile-list/tile-list';

/** One stop of the journey when it is told by role: the role, where it was held, and what it is made of. */
@Component({
  selector: 'li[sgRoleStop]',
  imports: [ArrowIcon, RichText, SplitBar, TileList, DateRangePipe, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'stop stop--role', 'data-hover': '' },
  template: `
    <p class="stop__when"><span class="stop__n" aria-hidden="true">{{ number() }}</span>{{ role().start | dateRange: (role().current ? '' : role().end) }}</p>
    <h3 class="stop__title">{{ role().name }}</h3>
    <ul class="stop__cos" [attr.aria-label]="'Companies' | t">
      @for (company of companies(); track company) {
        <li class="stop__co">{{ company }}</li>
      }
    </ul>
    @if (parts().length) {
      <ul sgSplitBar [parts]="parts()"></ul>
    }
    @if (role().summary) {
      <p class="stop__text"><sg-rich-text [text]="role().summary" /></p>
    }
    <dl sgTileList [tiles]="tiles()"></dl>
    @if (rolesChapterId(); as target) {
      <a class="badge stop__dive" [href]="'#' + target" [attr.data-cursor]="'Open' | t" (click)="focus.open(role().id)">
        {{ 'Deep dive' | t }}<span class="sr-only">: {{ role().name }}</span><svg sgArrowIcon></svg>
      </a>
    }
  `,
})
export class RoleStop {
  private readonly years = inject(PositionYears);
  private readonly translator = inject(Translator);
  protected readonly focus = inject(RoleFocus);
  readonly role = input.required<CvPosition>();
  readonly order = input.required<number>();
  /** The id of the roles chapter, when the page has one to dive into. */
  readonly rolesChapterId = input<string | null>(null);

  protected readonly number = computed(() => String(this.order()).padStart(2, '0'));
  protected readonly companies = computed(() => [...new Set(this.role().engagements.map((engagement) => engagement.name))]);
  protected readonly parts = computed(() => this.role().parts.filter((part) => part.count > 0));
  protected readonly tiles = computed<Tile[]>(() => {
    this.translator.lang();
    const t = (source: string): string => this.translator.t(source);
    const years = this.years.count(this.role());
    const companies = this.companies().length;
    const missions = this.role().engagements.reduce((sum, engagement) => sum + engagement.missions.length, 0);
    return [
      { value: String(years), label: t(years === 1 ? 'year' : 'years') },
      { value: String(companies), label: t(companies === 1 ? 'company' : 'companies') },
      ...(missions ? [{ value: String(missions), label: t(missions === 1 ? 'mission' : 'missions') }] : []),
    ];
  });
}
