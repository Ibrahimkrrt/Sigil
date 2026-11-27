import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CvContact } from '@domain/models/cv-contact';
import { safeUrl } from '@domain/text/safe-url';
import { ExternalLink } from '../../atoms/external-link/external-link';
import { TranslatePipe } from '../../pipes/translate.pipe';

/** Where the person is and how to reach them, as one line of links. */
@Component({
  selector: 'sg-contact-list',
  imports: [ExternalLink, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ul [attr.aria-label]="'Contact details' | t">
      @if (location()) {
        <li>{{ location() }}</li>
      }
      @if (contact().email; as email) {
        <li><a [href]="'mailto:' + email">{{ email }}</a></li>
      }
      @if (contact().phone; as phone) {
        <li><a [href]="'tel:' + dialable()">{{ phone }}</a></li>
      }
      @if (website(); as site) {
        <li><a sgExternalLink [url]="site">{{ siteLabel() }}</a></li>
      }
      @for (link of links(); track link.url) {
        <li><a sgExternalLink [url]="link.url">{{ link.label }}</a></li>
      }
    </ul>
  `,
  styles: `
    ul { display: flex; flex-wrap: wrap; gap: 2px 22px; margin: 12px 0 0; padding: 0; list-style: none; color: #4a4a48; }
    li { display: inline-flex; align-items: center; min-height: 32px; }
    a { color: #1f2bd6; text-decoration: underline; }
    @media print { a { color: #0b0b0d; text-decoration: none; } }
  `,
})
export class ContactList {
  readonly contact = input.required<CvContact>();
  readonly location = input('');
  protected readonly dialable = computed(() => this.contact().phone.replace(/[^+\d]/g, ''));
  protected readonly website = computed(() => safeUrl(this.contact().website));
  protected readonly siteLabel = computed(() => this.contact().website.replace(/^https?:\/\//, ''));
  protected readonly links = computed(() => this.contact().links.filter((link) => safeUrl(link.url)));
}
