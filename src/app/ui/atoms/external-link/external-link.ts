import { Directive, computed, input } from '@angular/core';
import { safeUrl } from '@domain/text/safe-url';

/**
 * A link whose address comes from the CV. Only web, mail, phone and relative addresses
 * are allowed; web links open in a new tab without handing over the opener.
 */
@Directive({
  selector: 'a[sgExternalLink]',
  host: {
    '[attr.href]': 'href()',
    '[attr.target]': 'web() ? "_blank" : null',
    '[attr.rel]': 'web() ? "noopener noreferrer" : null',
  },
})
export class ExternalLink {
  readonly url = input.required<string>();
  protected readonly href = computed(() => safeUrl(this.url()));
  protected readonly web = computed(() => /^https?:/i.test(this.href() ?? ''));
}
