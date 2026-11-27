import { ChangeDetectionStrategy, Component, booleanAttribute, computed, input } from '@angular/core';
import { parseRich } from '@domain/text/parse-rich';
import { ExternalLink } from '../external-link/external-link';

/**
 * Text from the CV with its light markup: **bold**, *emphasis*, [label](url), line breaks.
 * With `ink`, the emphasised phrase becomes a block of the chapter's ink (two-tone titles).
 */
@Component({
  selector: 'sg-rich-text',
  imports: [ExternalLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @for (token of tokens(); track $index) {
      @switch (token.kind) {
        @case ('text') {{{ token.text }}}
        @case ('strong') {<strong>{{ token.text }}</strong>}
        @case ('em') {<em [class.ink]="ink()">{{ token.text }}</em>}
        @case ('link') {<a sgExternalLink [url]="token.url">{{ token.text }}</a>}
        @case ('break') {<br />}
      }
    }
  `,
  styles: `:host { display: contents; }`,
})
export class RichText {
  readonly text = input.required<string>();
  readonly ink = input(false, { transform: booleanAttribute });
  protected readonly tokens = computed(() => parseRich(this.text()));
}
