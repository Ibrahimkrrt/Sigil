import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CvCredential } from '@domain/models/cv-credential';
import { CvModel } from '@domain/models/cv-model';
import { RecruiterAchievements } from '../../organisms/recruiter-achievements/recruiter-achievements';
import { RecruiterCustom } from '../../organisms/recruiter-custom/recruiter-custom';
import { RecruiterEducation } from '../../organisms/recruiter-education/recruiter-education';
import { RecruiterExperience } from '../../organisms/recruiter-experience/recruiter-experience';
import { RecruiterHeader } from '../../organisms/recruiter-header/recruiter-header';
import { RecruiterList } from '../../organisms/recruiter-list/recruiter-list';
import { RecruiterProjects } from '../../organisms/recruiter-projects/recruiter-projects';
import { RecruiterSkills } from '../../organisms/recruiter-skills/recruiter-skills';
import { RecruiterSection } from '../../molecules/recruiter-section/recruiter-section';
import { RichText } from '../../atoms/rich-text/rich-text';
import { TranslatePipe } from '../../pipes/translate.pipe';

/**
 * Recruiter mode: the same CV as a conventional, fast-to-scan document.
 * Semantic HTML, one heading outline, no motion. It is also the print layout.
 */
@Component({
  selector: 'sg-recruiter-document',
  imports: [
    RecruiterHeader, RecruiterSection, RecruiterExperience, RecruiterAchievements, RecruiterProjects, RecruiterCustom,
    RecruiterSkills, RecruiterEducation, RecruiterList, RichText, TranslatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './recruiter-document.html',
  styleUrl: './recruiter-document.scss',
})
export class RecruiterDocument {
  readonly model = input.required<CvModel>();

  protected readonly customSections = computed(() =>
    this.model().sections.filter((section) => section.type === 'custom' && section.modes.includes('recruiter')));
  protected readonly hasSkills = computed(() => this.model().skills.technical.length + this.model().skills.soft.length > 0);
  protected readonly languages = computed(() =>
    this.model().skills.languages.map((language) => (language.level ? `${language.name} (${language.level})` : language.name)));
  protected readonly hasSide = computed(() => {
    const model = this.model();
    return this.hasSkills() || model.education.length + model.certifications.length + model.awards.length
      + model.skills.languages.length + model.interests.length > 0;
  });

  protected credentialLines(credentials: readonly CvCredential[]): string[] {
    return credentials.map((credential) => [credential.title, credential.issuer, credential.year].filter(Boolean).join(', '));
  }
}
