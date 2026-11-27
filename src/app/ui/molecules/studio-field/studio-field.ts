import { ChangeDetectionStrategy, Component, booleanAttribute, computed, inject, input, signal } from '@angular/core';
import { FieldCodec } from '@core/studio/field-codec';
import { StudioStore } from '@core/studio/studio-store';

/** One labelled field of the Studio, bound to a path in the CV file. */
@Component({
  selector: 'sg-studio-field',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'st-field' },
  template: `
    <label [for]="id">{{ label() }}</label>
    @if (area()) {
      <textarea [id]="id" class="st-input" [rows]="rows()" [placeholder]="placeholder()" [value]="shown()" (focus)="typing.set(text())" (blur)="typing.set(null)" (input)="write($any($event.target).value)"></textarea>
    } @else {
      <input [id]="id" type="text" class="st-input" autocomplete="off" [placeholder]="placeholder()" [value]="shown()" (focus)="typing.set(text())" (blur)="typing.set(null)" (input)="write($any($event.target).value)" />
    }
    @if (hint()) {
      <p class="st-hint">{{ hint() }}</p>
    }
  `,
})
export class StudioField {
  private static count = 0;
  private readonly store = inject(StudioStore);
  readonly label = input.required<string>();
  /** The dotted path of the field in the CV file. */
  readonly path = input.required<string>();
  readonly area = input(false, { transform: booleanAttribute });
  readonly rows = input(3);
  readonly hint = input('');
  readonly placeholder = input('');
  /** Converts between the stored value and the edited text, when they differ. */
  readonly codec = input<FieldCodec | null>(null);
  /** The same value in every language: written to the CV itself, never to a translation. */
  readonly shared = input(false, { transform: booleanAttribute });

  protected readonly id = `st-field-${++StudioField.count}`;
  protected readonly text = computed(() => {
    const value = this.store.value(this.path());
    const codec = this.codec();
    if (codec) return codec.read(value);
    return typeof value === 'string' || typeof value === 'number' ? String(value) : '';
  });

  /** What the person is typing, while the field has focus; the stored value never rewrites it under them. */
  protected readonly typing = signal<string | null>(null);
  protected readonly shown = computed(() => this.typing() ?? this.text());

  protected write(text: string): void {
    this.typing.set(text);
    const value = this.codec() ? this.codec()!.write(text) : text;
    if (this.shared()) this.store.setShared(this.path(), value);
    else this.store.set(this.path(), value);
  }
}
