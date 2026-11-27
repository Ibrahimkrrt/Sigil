import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, afterRenderEffect, computed, effect, inject, input, untracked, viewChildren } from '@angular/core';
import { ChapterTracker } from '@core/layout/chapter-tracker';
import { InPageNavigation } from '@core/layout/in-page-navigation';
import { EffectsInstaller } from '@core/motion/effects-installer';
import { MotionSettings } from '@core/motion/motion-settings';
import { CvChapter } from '@domain/models/cv-chapter';
import { CvModel } from '@domain/models/cv-model';
import { RevealDirective } from '../../directives/reveal.directive';
import { ChapterHeader } from '../../molecules/chapter-header/chapter-header';
import { InfoRow } from '../../molecules/info-row/info-row';
import { StatList } from '../../molecules/stat-list/stat-list';
import { TimelineList } from '../../molecules/timeline-list/timeline-list';
import { ContactChapter } from '../../organisms/contact-chapter/contact-chapter';
import { CredentialsChapter } from '../../organisms/credentials-chapter/credentials-chapter';
import { CustomChapter } from '../../organisms/custom-chapter/custom-chapter';
import { HeroChapter } from '../../organisms/hero-chapter/hero-chapter';
import { JourneyChapter } from '../../organisms/journey-chapter/journey-chapter';
import { ProjectsChapter } from '../../organisms/projects-chapter/projects-chapter';
import { RolesChapter } from '../../organisms/roles-chapter/roles-chapter';
import { SiteFooter } from '../../organisms/site-footer/site-footer';
import { SkillsChapter } from '../../organisms/skills-chapter/skills-chapter';
import { SummaryChapter } from '../../organisms/summary-chapter/summary-chapter';

/**
 * The immersive view: a portfolio told in chapters. An opening, the story, the journey
 * role by role, the roles taken with a deep dive into each, the work, the skills, and a
 * way to get in touch.
 */
@Component({
  selector: 'sg-immersive-story',
  imports: [
    ChapterHeader, InfoRow, StatList, TimelineList, RevealDirective, HeroChapter, SummaryChapter, JourneyChapter, RolesChapter,
    ProjectsChapter, SkillsChapter, CredentialsChapter, ContactChapter, CustomChapter, SiteFooter,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'scv__main', '[class.has-motion]': 'motion.enabled()', 'data-view': 'immersive' },
  templateUrl: './immersive-story.html',
})
export class ImmersiveStory {
  private readonly tracker = inject(ChapterTracker);
  private readonly effects = inject(EffectsInstaller);
  private readonly navigation = inject(InPageNavigation);
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  protected readonly motion = inject(MotionSettings);
  readonly model = input.required<CvModel>();
  readonly chapters = input.required<readonly CvChapter[]>();

  protected readonly rolesChapterId = computed(() => this.chapters().find((chapter) => chapter.type === 'roles')?.id ?? null);
  private readonly sections = viewChildren<ElementRef<HTMLElement>>('section');

  constructor() {
    let stop: (() => void) | null = null;
    // Follow the chapters as they are rendered; start again when the list changes (a new language, a new CV).
    afterRenderEffect(() => {
      const elements = this.sections().map((section) => section.nativeElement);
      stop?.();
      stop = elements.length ? this.tracker.watch(elements) : null;
    });
    // Everything that moves is installed once the chapters are in the page, and again when they change.
    let removeEffects: (() => void) | null = null;
    afterRenderEffect(() => {
      const model = this.model();
      this.chapters();
      this.motion.level();
      const main = this.element.nativeElement;
      const root = main.closest<HTMLElement>('.scv');
      // Installing reads other state (the pause control, the language); none of it may count as a reason to install again.
      untracked(() => {
        removeEffects?.();
        removeEffects = root ? this.effects.install({ root, main, model, goTo: (id) => this.navigation.goTo(root, id) }) : null;
      });
    });
    effect(() => this.effects.pause(this.motion.paused()));
    inject(DestroyRef).onDestroy(() => {
      stop?.();
      removeEffects?.();
    });
  }
}
