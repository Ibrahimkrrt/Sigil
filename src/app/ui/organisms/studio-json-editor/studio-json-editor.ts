import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { AdaptedCv } from '@core/cv/import/adapted-cv';
import { CvValidator } from '@core/cv/validate/cv-validator';
import { Translator } from '@core/i18n/translator';
import { LiveAnnouncer } from '@core/layout/live-announcer';
import { StudioStore } from '@core/studio/studio-store';
import { TranslatePipe } from '../../pipes/translate.pipe';

/** The JSON tab: the CV file as text, converted on the way in when it is another format, and its validation report. */
@Component({
  selector: 'sg-studio-json-editor',
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './studio-json-editor.html',
})
export class StudioJsonEditor {
  protected readonly store = inject(StudioStore);
  private readonly validator = inject(CvValidator);
  private readonly translator = inject(Translator);
  private readonly announcer = inject(LiveAnnouncer);

  /** The result of the last parse: a message, and whether it is an error. */
  protected readonly message = signal<{ readonly text: string; readonly error: boolean } | null>(null);
  protected readonly formatted = computed(() => JSON.stringify(this.store.raw(), null, 2));
  private readonly area = viewChild.required<ElementRef<HTMLTextAreaElement>>('area');
  private timer = 0;

  constructor() {
    // The text follows edits made in the other tabs, but never rewrites what is being typed here.
    effect(() => {
      const text = this.formatted();
      const area = this.area().nativeElement;
      untracked(() => {
        if (document.activeElement !== area) area.value = text;
      });
    });
  }

  /** Apply the text once the person pauses typing. */
  protected typed(text: string): void {
    clearTimeout(this.timer);
    this.timer = window.setTimeout(() => this.apply(text), 450);
  }

  /** Parse a CV file as text and load it. Returns true when it was accepted. */
  apply(text: string, fileName?: string): boolean {
    const parsed = this.validator.parseJson(text);
    if (parsed.error) {
      this.message.set({ text: parsed.error, error: true });
      return false;
    }
    const imported = this.store.load(parsed.data, fileName);
    this.message.set({ text: imported.converted ? this.conversionNote(imported) : this.translator.t('Parsed. The preview is up to date.'), error: false });
    if (imported.converted) this.area().nativeElement.value = this.formatted();
    return true;
  }

  focus(): void {
    const area = this.area().nativeElement;
    area.focus();
    area.select();
  }

  protected format(): void {
    this.area().nativeElement.value = this.formatted();
  }

  protected async copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.area().nativeElement.value);
      this.announcer.say(this.translator.t('JSON copied.'));
    } catch {
      this.focus();
    }
  }

  /** What a conversion found, so a person can check it. */
  private conversionNote(imported: AdaptedCv): string {
    const t = (source: string, vars?: Record<string, string>): string => this.translator.t(source, vars);
    const found = imported.found;
    const parts = ([['experience', 'positions'], ['education', 'schools'], ['skills', 'skills'], ['projects', 'projects'], ['languages', 'languages']] as const)
      .filter(([key]) => found[key])
      .map(([key, label]) => `${found[key]} ${t(label)}`);
    return t('Converted from {format}. Found: {parts}. Check the result; anything not recognised was left out.', {
      format: imported.label === 'another CV format' ? t('another CV format') : imported.label,
      parts: parts.join(', ') || t('nothing recognisable'),
    });
  }
}
