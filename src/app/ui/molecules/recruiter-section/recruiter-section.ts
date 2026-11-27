import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** One titled part of the recruiter document. The heading can take focus, for in-page navigation. */
@Component({
  selector: 'sg-recruiter-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="sec" [id]="anchor()" [attr.aria-labelledby]="anchor() + '-h'">
      <h2 [id]="anchor() + '-h'" tabindex="-1">{{ heading() }}</h2>
      <ng-content />
    </section>
  `,
  styleUrl: './recruiter-section.scss',
})
export class RecruiterSection {
  readonly id = input.required<string>();
  readonly heading = input.required<string>();
  protected readonly anchor = computed(() => `rec-${this.id()}`);
}
