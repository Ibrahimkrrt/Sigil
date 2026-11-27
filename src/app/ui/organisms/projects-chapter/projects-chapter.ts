import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CvChapter } from '@domain/models/cv-chapter';
import { CvModel } from '@domain/models/cv-model';
import { ChapterHeader } from '../../molecules/chapter-header/chapter-header';
import { ProjectCard } from '../../molecules/project-card/project-card';

/** Selected work, as cards that open into case studies. A designer's first project leads. */
@Component({
  selector: 'sg-projects-chapter',
  imports: [ChapterHeader, ProjectCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'sg-contents' },
  template: `
    <header sgChapterHeader [chapter]="chapter()" [index]="index()"></header>
    <div class="cards">
      @for (project of model().projects; track project.id) {
        <article sgProjectCard [project]="project" [order]="$index + 1" [featured]="model().archetype === 'designer' && $index === 0"></article>
      }
    </div>
  `,
})
export class ProjectsChapter {
  readonly chapter = input.required<CvChapter>();
  readonly index = input.required<number>();
  readonly model = input.required<CvModel>();
}
