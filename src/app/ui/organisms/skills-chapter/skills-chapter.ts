import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { EffectsInstaller } from '@core/motion/effects-installer';
import { MotionSettings } from '@core/motion/motion-settings';
import { CvChapter } from '@domain/models/cv-chapter';
import { CvLanguage } from '@domain/models/cv-language';
import { CvModel } from '@domain/models/cv-model';
import { RevealDirective } from '../../directives/reveal.directive';
import { ChapterHeader } from '../../molecules/chapter-header/chapter-header';
import { ChipList } from '../../molecules/chip-list/chip-list';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { SkillCluster } from './skill-cluster';

/**
 * Skills: a pile of blocks you can pick up and throw, or a plain list. Both views hold
 * the same skills; the pile only moves them. Spoken languages follow.
 */
@Component({
  selector: 'sg-skills-chapter',
  imports: [ChapterHeader, ChipList, RevealDirective, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'sg-contents' },
  templateUrl: './skills-chapter.html',
})
export class SkillsChapter {
  readonly chapter = input.required<CvChapter>();
  readonly index = input.required<number>();
  readonly model = input.required<CvModel>();

  private readonly motion = inject(MotionSettings);
  protected readonly effects = inject(EffectsInstaller);

  /** The pile is offered when motion is on and the CV keeps physics. */
  protected readonly live = computed(() => {
    const skills = this.model().skills;
    return this.motion.enabled() && this.model().theme.effects.physics && skills.technical.length + skills.soft.length > 0;
  });
  protected readonly view = signal<'pile' | 'list'>('pile');
  protected readonly groupNames = computed(() => [...new Set(this.model().skills.technical.map((skill) => skill.group).filter(Boolean))]);
  protected readonly rated = computed(() => this.model().skills.technical.some((skill) => skill.level != null));
  protected readonly clusters = computed<SkillCluster[]>(() => {
    const technical = this.model().skills.technical;
    const groups = [...new Set(technical.map((skill) => skill.group).filter(Boolean))];
    return (groups.length ? groups : ['']).map((name) => {
      const skills = technical.filter((skill) => skill.group === name);
      return { name, skills, names: skills.map((skill) => skill.name) };
    });
  });

  /** Which of the three brick styles a skill's group uses. */
  protected brickStyle(group: string): number {
    return Math.max(0, this.groupNames().indexOf(group)) % 3;
  }

  /** How many of five dots a language's score fills; zero when the CV gives no score. */
  protected dots(language: CvLanguage): number {
    return language.score != null ? Math.max(1, Math.round(language.score / 20)) : 0;
  }
}
