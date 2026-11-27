import { ChangeDetectionStrategy, Component, ElementRef, inject, input, signal, viewChild } from '@angular/core';
import { CvExporter } from '@core/export/cv-exporter';
import { PdfFormat } from '@core/export/pdf-format';
import { PDF_FORMATS } from '@core/export/pdf-formats';
import { Translator } from '@core/i18n/translator';
import { LiveAnnouncer } from '@core/layout/live-announcer';
import { CvModel } from '@domain/models/cv-model';
import { TranslatePipe } from '../../pipes/translate.pipe';

/**
 * The "Download CV" control: three PDFs generated in the browser from the same model,
 * and the browser's print dialog. The print-ready edition first asks whether the
 * accessible edition should travel in the same file.
 */
@Component({
  selector: 'sg-download-menu',
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'dl', '(keydown.escape)': 'close(true)', '(document:click)': 'closeIfOutside($event)' },
  templateUrl: './download-menu.html',
})
export class DownloadMenu {
  private readonly exporter = inject(CvExporter);
  private readonly translator = inject(Translator);
  private readonly announcer = inject(LiveAnnouncer);
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private static count = 0;

  readonly model = input.required<CvModel>();
  /** The class of the button: `pill` on a coloured chapter, `btn` in the recruiter document. */
  readonly buttonClass = input('pill');

  protected readonly formats = PDF_FORMATS;
  protected readonly id = `dl-${++DownloadMenu.count}`;
  protected readonly open = signal(false);
  private readonly button = viewChild.required<ElementRef<HTMLButtonElement>>('button');
  private readonly ask = viewChild.required<ElementRef<HTMLDialogElement>>('ask');

  protected toggle(): void {
    this.open.update((open) => !open);
    if (this.open()) setTimeout(() => this.element.nativeElement.querySelector<HTMLElement>('.menu button')?.focus());
  }

  protected close(refocus = false): void {
    if (!this.open()) return;
    this.open.set(false);
    if (refocus) this.button().nativeElement.focus();
  }

  protected closeIfOutside(event: Event): void {
    if (!this.element.nativeElement.contains(event.target as Node)) this.close();
  }

  protected choose(format: PdfFormat): void {
    this.close();
    if (format.id === 'print') this.ask().nativeElement.showModal();
    else void this.make(format, false);
  }

  /** The reader's answer to "add the accessible version?". */
  protected answer(append: boolean): void {
    this.ask().nativeElement.close();
    void this.make(PDF_FORMATS[2], append);
  }

  protected cancel(): void {
    this.ask().nativeElement.close();
    this.button().nativeElement.focus();
  }

  protected closeOnBackdrop(event: MouseEvent): void {
    if (event.target === this.ask().nativeElement) this.ask().nativeElement.close();
  }

  protected print(): void {
    this.close();
    window.print();
  }

  private async make(format: PdfFormat, append: boolean): Promise<void> {
    await this.exporter.savePdf(this.model(), format.id, { append });
    this.announcer.say(this.translator.t('{label} ready.', { label: this.translator.t(format.label) }));
    this.button().nativeElement.focus();
  }
}
