import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CvContact } from '@domain/models/cv-contact';
import { CvProfile } from '@domain/models/cv-profile';
import { ContactList } from '../../molecules/contact-list/contact-list';

/** The top of the recruiter document: who this is and how to reach them. Actions are projected in. */
@Component({
  selector: 'sg-recruiter-header',
  imports: [ContactList],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="id">
      <h1 id="rec-title" tabindex="-1">{{ profile().name }}</h1>
      @if (profile().headline) {
        <p class="headline">{{ profile().headline }}</p>
      }
      <sg-contact-list [contact]="contact()" [location]="profile().location" />
    </div>
    <div class="actions"><ng-content /></div>
  `,
  styleUrl: './recruiter-header.scss',
})
export class RecruiterHeader {
  readonly profile = input.required<CvProfile>();
  readonly contact = input.required<CvContact>();
}
