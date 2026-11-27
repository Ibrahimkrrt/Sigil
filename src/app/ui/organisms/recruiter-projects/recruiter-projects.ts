import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CvProject } from '@domain/models/cv-project';
import { ExternalLink } from '../../atoms/external-link/external-link';
import { RecruiterItem } from '../../molecules/recruiter-item/recruiter-item';
import { RecruiterSection } from '../../molecules/recruiter-section/recruiter-section';
import { PlainTextPipe } from '../../pipes/plain-text.pipe';
import { TranslatePipe } from '../../pipes/translate.pipe';

/** Selected projects: what each was, the person's part in it, and where to see it. */
@Component({
  selector: 'sg-recruiter-projects',
  imports: [RecruiterSection, RecruiterItem, ExternalLink, PlainTextPipe, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <sg-recruiter-section id="projects" [heading]="'Projects' | t">
      @for (project of projects(); track project.id) {
        <sg-recruiter-item [heading]="project.title" [when]="project.year" [meta]="project.role">
          <p>{{ description(project) | plain }}</p>
          @if (project.link; as link) {
            <p><a sgExternalLink [url]="link.url">{{ link.label }}</a></p>
          }
        </sg-recruiter-item>
      }
    </sg-recruiter-section>
  `,
  styles: `
    :host { display: block; }
    p { margin: 0; }
    a { color: #1f2bd6; }
    sg-recruiter-item + sg-recruiter-item { margin-top: 12px; }
    @media print { a { color: #0b0b0d; text-decoration: none; } }
  `,
})
export class RecruiterProjects {
  readonly projects = input.required<readonly CvProject[]>();

  protected description(project: CvProject): string {
    return [project.summary, project.outcome].filter(Boolean).join(' ');
  }
}
