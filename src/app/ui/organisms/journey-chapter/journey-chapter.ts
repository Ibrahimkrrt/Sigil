import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CvChapter } from '@domain/models/cv-chapter';
import { CvModel } from '@domain/models/cv-model';
import { ArrowIcon } from '../../atoms/arrow-icon/arrow-icon';
import { ChapterHeader } from '../../molecules/chapter-header/chapter-header';
import { EntryStop } from '../../molecules/entry-stop/entry-stop';
import { RoleStop } from '../../molecules/role-stop/role-stop';
import { PlainTextPipe } from '../../pipes/plain-text.pipe';
import { TranslatePipe } from '../../pipes/translate.pipe';

/**
 * The journey, on a strip that scrolls sideways. With roles in the CV it is told by
 * role, one stop each; without them, one stop per experience entry.
 */
@Component({
  selector: 'sg-journey-chapter',
  imports: [ChapterHeader, ArrowIcon, RoleStop, EntryStop, PlainTextPipe, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'sg-contents' },
  template: `
    <header sgChapterHeader [chapter]="chapter()" [index]="index()">
      <p class="hint" aria-hidden="true">{{ 'Drag or scroll sideways' | t }} <svg sgArrowIcon></svg></p>
    </header>
    <div class="track" data-drag tabindex="0" role="group" [attr.aria-label]="chapter().title | plain">
      <ol class="track__list">
        @for (role of roles(); track role.id) {
          <li sgRoleStop [role]="role" [order]="$index + 1" [rolesChapterId]="rolesChapterId()"></li>
        } @empty {
          @for (entry of model().experience; track entry.id) {
            <li sgEntryStop [entry]="entry" [order]="model().experience.length - $index"></li>
          }
        }
      </ol>
    </div>
  `,
})
export class JourneyChapter {
  readonly chapter = input.required<CvChapter>();
  readonly index = input.required<number>();
  readonly model = input.required<CvModel>();
  readonly rolesChapterId = input<string | null>(null);
  protected readonly roles = computed(() => this.model().positions.filter((position) => position.kind === 'role'));
}
