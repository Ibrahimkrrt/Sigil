import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** A wrapping row of small bordered labels. */
@Component({
  selector: 'sg-tag-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ul>
      @for (tag of tags(); track $index) {
        <li>{{ tag }}</li>
      }
    </ul>
  `,
  styles: `
    ul { display: flex; flex-wrap: wrap; gap: 8px; margin: 0; padding: 0; list-style: none; }
    li { padding: 4px 10px; border: 1px solid #0b0b0d; font-family: var(--mono); font-size: 0.8125rem; font-weight: 500; }
    @media print { li { border-color: #6e6e6a; } }
  `,
})
export class TagList {
  readonly tags = input.required<readonly string[]>();
}
