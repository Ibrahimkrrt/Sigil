import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CvSection } from '@domain/models/cv-section';
import { asText } from '@domain/read/as-text';
import { plainText } from '@domain/text/plain-text';
import { RichText } from '../../atoms/rich-text/rich-text';
import { RecruiterSection } from '../../molecules/recruiter-section/recruiter-section';

/** A custom section in the recruiter document: its text only, without the visual blocks. */
@Component({
  selector: 'sg-recruiter-custom',
  imports: [RecruiterSection, RichText],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (texts().length) {
      <sg-recruiter-section [id]="section().id" [heading]="heading()">
        @for (text of texts(); track $index) {
          <p><sg-rich-text [text]="text" /></p>
        }
      </sg-recruiter-section>
    }
  `,
  styles: `
    :host { display: block; }
    :host:empty { display: none; }
    p { margin: 0; }
  `,
})
export class RecruiterCustom {
  readonly section = input.required<CvSection>();
  protected readonly heading = computed(() => plainText(this.section().title) || this.section().nav);
  protected readonly texts = computed(() => {
    const textual = this.section().blocks.filter((block) => !block['type'] || ['text', 'richtext', 'quote'].includes(asText(block['type'])));
    return [this.section().text, ...textual.map((block) => asText(block['text']))].filter(Boolean);
  });
}
