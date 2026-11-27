import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, input, signal, viewChild } from '@angular/core';
import { Translator } from '@core/i18n/translator';
import { LiveAnnouncer } from '@core/layout/live-announcer';
import { CvChapter } from '@domain/models/cv-chapter';
import { CvLink } from '@domain/models/cv-link';
import { CvModel } from '@domain/models/cv-model';
import { safeUrl } from '@domain/text/safe-url';
import { ArrowIcon } from '../../atoms/arrow-icon/arrow-icon';
import { ExternalLink } from '../../atoms/external-link/external-link';
import { SplitChars } from '../../atoms/split-chars/split-chars';
import { FitTextDirective } from '../../directives/fit-text.directive';
import { ChapterHeader } from '../../molecules/chapter-header/chapter-header';
import { TranslatePipe } from '../../pipes/translate.pipe';

/** The close: the email address as large as the page allows, then every other way to get in touch. */
@Component({
  selector: 'sg-contact-chapter',
  imports: [ChapterHeader, ArrowIcon, ExternalLink, SplitChars, FitTextDirective, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contact' },
  templateUrl: './contact-chapter.html',
})
export class ContactChapter {
  private readonly translator = inject(Translator);
  private readonly announcer = inject(LiveAnnouncer);
  readonly chapter = input.required<CvChapter>();
  readonly index = input.required<number>();
  readonly model = input.required<CvModel>();

  protected readonly copied = signal(false);
  protected readonly dialable = computed(() => this.model().contact.phone.replace(/[^+\d]/g, ''));
  protected readonly links = computed<CvLink[]>(() => {
    this.translator.lang();
    const contact = this.model().contact;
    const website = contact.website ? [{ label: this.translator.t('Website'), url: contact.website }] : [];
    return [...website, ...contact.links].filter((link) => safeUrl(link.url));
  });
  private readonly address = viewChild<ElementRef<HTMLElement>>('address');

  /** Copy the email address; where the clipboard is refused, select it so the reader can copy it. */
  protected async copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.model().contact.email);
      this.copied.set(true);
      this.announcer.say(this.translator.t('Email address copied.'));
    } catch {
      const target = this.address()?.nativeElement;
      if (!target) return;
      const range = document.createRange();
      range.selectNodeContents(target);
      const selection = getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      this.announcer.say(this.translator.t('Address selected. Press copy.'));
    }
  }
}
