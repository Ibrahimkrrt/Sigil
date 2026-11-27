import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { SegmentOption } from './segment-option';

/** A row of mutually exclusive choices, shown as joined buttons. */
@Component({
  selector: 'sg-segmented-control',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { role: 'group', '[attr.aria-label]': 'label()' },
  template: `
    @for (option of options(); track option.value) {
      <button type="button" [attr.aria-pressed]="option.value === value()" [attr.data-value]="option.value" (click)="value.set(option.value)">
        {{ option.label }}
        @if (option.title) {
          <span class="sr-only">{{ option.title }}</span>
        }
      </button>
    }
  `,
  styleUrl: './segmented-control.scss',
})
export class SegmentedControl {
  readonly label = input.required<string>();
  readonly options = input.required<readonly SegmentOption[]>();
  readonly value = model.required<string>();
}
