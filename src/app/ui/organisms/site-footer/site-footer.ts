import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CvModel } from '@domain/models/cv-model';
import { SigilMark } from '../../atoms/sigil-mark/sigil-mark';
import { MarqueeStrip } from '../../molecules/marquee-strip/marquee-strip';
import { TranslatePipe } from '../../pipes/translate.pipe';

/** The close of the page: the name once more, the signature, and the way back up. */
@Component({
  selector: 'footer[sgSiteFooter]',
  imports: [SigilMark, MarqueeStrip, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'foot' },
  template: `
    @if (model().theme.effects.marquee) {
      <sg-marquee-strip class="foot__marquee" [items]="strip()" />
    }
    <div class="foot__row">
      <p>{{ model().meta.demoNotice || model().profile.name + '. ' + year + '.' }}</p>
      <p class="foot__made">{{ 'Built with Angular, CSS and WebGL.' | t }}</p>
      <p class="foot__sig" aria-hidden="true"><svg sgSigilMark [seed]="model().theme.seed"></svg>SIG {{ model().theme.code }}</p>
      <a [href]="'#' + topId()" data-scramble><span data-scramble-text>{{ 'Back to the top' | t }}</span> ↑</a>
    </div>
  `,
})
export class SiteFooter {
  readonly model = input.required<CvModel>();
  readonly topId = input.required<string>();
  protected readonly year = new Date().getFullYear();
  protected readonly strip = computed(() => {
    const profile = this.model().profile;
    return [profile.name, profile.headline, profile.location].filter(Boolean);
  });
}
