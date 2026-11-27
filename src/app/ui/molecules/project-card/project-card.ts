import { ChangeDetectionStrategy, Component, booleanAttribute, computed, input } from '@angular/core';
import { CvProject } from '@domain/models/cv-project';
import { ArrowIcon } from '../../atoms/arrow-icon/arrow-icon';
import { CvPicture } from '../../atoms/cv-picture/cv-picture';
import { PatternTile } from '../../atoms/pattern-tile/pattern-tile';
import { RichText } from '../../atoms/rich-text/rich-text';
import { RevealDirective } from '../../directives/reveal.directive';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { ProjectDialog } from '../project-dialog/project-dialog';

/** One project: its cover, what it was, and the way into its case study. */
@Component({
  selector: 'article[sgProjectCard]',
  imports: [ArrowIcon, CvPicture, PatternTile, RichText, ProjectDialog, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  hostDirectives: [RevealDirective],
  host: { class: 'card', '[class.card--feature]': 'featured()', 'data-hover': '' },
  template: `
    @if (cover(); as image) {
      <sg-cv-picture class="card__media" [image]="image" [seed]="project().id" />
    } @else {
      <div class="pic pic--gen card__media" data-hover><sg-pattern-tile [seed]="project().id + project().title" /></div>
    }
    <div class="card__body">
      <p class="card__idx" aria-hidden="true">P{{ order().toString().padStart(2, '0') }}</p>
      <h3 class="card__title">{{ project().title }}</h3>
      <p class="meta">{{ meta() }}</p>
      @if (project().summary) {
        <p class="card__text"><sg-rich-text [text]="project().summary" /></p>
      }
      <button type="button" class="textbtn" aria-haspopup="dialog" data-scramble (click)="dialog.open()">
        <span data-scramble-text>{{ 'Open the case' | t }}</span><span class="sr-only">: {{ project().title }}</span><svg sgArrowIcon></svg>
      </button>
    </div>
    <dialog sgProjectDialog #dialog="sgProjectDialog" [project]="project()"></dialog>
  `,
})
export class ProjectCard {
  readonly project = input.required<CvProject>();
  readonly order = input.required<number>();
  /** Give this card the larger, leading treatment. */
  readonly featured = input(false, { transform: booleanAttribute });
  protected readonly cover = computed(() => this.project().image ?? this.project().gallery[0] ?? null);
  protected readonly meta = computed(() => [this.project().role, this.project().year].filter(Boolean).join(' · '));
}
