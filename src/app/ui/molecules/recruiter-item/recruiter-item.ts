import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** One dated entry of the recruiter document: a title, when, a line of context, then its content. */
@Component({
  selector: 'sg-recruiter-item',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.sub]': 'nested()' },
  template: `
    <article>
      <div class="row">
        <h3>{{ heading() }}</h3>
        @if (when()) {
          <span class="when">{{ when() }}</span>
        }
      </div>
      @if (meta()) {
        <p class="meta">{{ meta() }}</p>
      }
      <ng-content />
    </article>
  `,
  styleUrl: './recruiter-item.scss',
})
export class RecruiterItem {
  readonly heading = input.required<string>();
  readonly when = input('');
  readonly meta = input('');
  /** A client mission delivered through the employer listed just above it. */
  readonly nested = input(false);
}
