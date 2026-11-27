import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CvSkills } from '@domain/models/cv-skills';
import { RecruiterSection } from '../../molecules/recruiter-section/recruiter-section';
import { TagList } from '../../molecules/tag-list/tag-list';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { SkillGroup } from './skill-group';

/** Skills by group, as tags, with professional skills last. */
@Component({
  selector: 'sg-recruiter-skills',
  imports: [RecruiterSection, TagList, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <sg-recruiter-section id="skills" [heading]="'Skills' | t">
      @for (group of groups(); track group.name) {
        @if (group.name) {
          <h3>{{ group.name }}</h3>
        }
        <sg-tag-list [tags]="group.skills" />
      }
      @if (skills().soft.length) {
        <h3>{{ 'Professional' | t }}</h3>
        <sg-tag-list [tags]="skills().soft" />
      }
    </sg-recruiter-section>
  `,
  styles: `
    :host { display: block; }
    h3 { margin: 0; font-size: 1.2rem; font-weight: 700; line-height: 1.25; }
  `,
})
export class RecruiterSkills {
  readonly skills = input.required<CvSkills>();
  protected readonly groups = computed<SkillGroup[]>(() => {
    const technical = this.skills().technical;
    return [...new Set(technical.map((skill) => skill.group))].map((name) => ({
      name,
      skills: technical.filter((skill) => skill.group === name).map((skill) => skill.name),
    }));
  });
}
