import { Injectable, computed, inject, signal, untracked } from '@angular/core';
import { CvChapter } from '@domain/models/cv-chapter';
import { CvModel } from '@domain/models/cv-model';
import { LooseRecord } from '@domain/models/loose-record';
import { ViewMode } from '@domain/models/view-mode';
import { asRecord } from '@domain/read/as-record';
import { CvLocalizer } from '../../i18n/cv-localizer';
import { Translator } from '../../i18n/translator';
import { AdaptedCv } from '../import/adapted-cv';
import { CvAdapter } from '../import/cv-adapter';
import { ChapterInkAssigner } from '../normalize/chapter-ink-assigner';
import { CvNormalizer } from '../normalize/cv-normalizer';

/**
 * The single source of truth for the CV on screen: the file that was loaded, the
 * language and view the reader chose, and the model derived from them.
 */
@Injectable({ providedIn: 'root' })
export class CvStore {
  private readonly adapter = inject(CvAdapter);
  private readonly localizer = inject(CvLocalizer);
  private readonly normalizer = inject(CvNormalizer);
  private readonly inkAssigner = inject(ChapterInkAssigner);
  private readonly translator = inject(Translator);

  /** Whether the visitor's system asks for dark pages: the `auto` theme mode follows it. */
  private readonly prefersDark = typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches;
  private readonly source = signal<AdaptedCv | null>(null);
  private readonly chosenLang = signal<string | null>(null);
  private readonly chosenMode = signal<ViewMode>('immersive');

  /** What the importer made of the loaded file, or null before anything is loaded. */
  readonly imported = this.source.asReadonly();
  readonly mode = this.chosenMode.asReadonly();

  /** The CV file in the engine's format, before translation. */
  readonly raw = computed<LooseRecord>(() => asRecord(this.source()?.data));
  readonly languages = computed(() => this.localizer.languagesOf(this.raw()));
  /** The language on screen: the reader's choice, or the language the CV is written in. */
  readonly lang = computed(() => {
    const chosen = this.chosenLang();
    const { base, all } = this.languages();
    return chosen && all.includes(chosen) ? chosen : base;
  });

  /** The CV model in the current language, or null before anything is loaded. */
  readonly model = computed<CvModel | null>(() => {
    if (!this.source()) return null;
    // Interface strings are part of the model (default titles), so the model follows the translator's language.
    const lang = this.translator.lang();
    return this.normalizer.normalize(this.localizer.localize(this.raw(), lang));
  });

  /** The chapters of the current view, each with its ink and ground. */
  readonly chapters = computed<CvChapter[]>(() => {
    const model = this.model();
    if (!model) return [];
    const visible = model.sections.filter((section) => section.modes.includes('immersive'));
    return this.inkAssigner.assign(visible, model.theme, this.prefersDark);
  });

  /** Load a CV file in any supported format. */
  load(file: unknown): AdaptedCv {
    const adapted = this.adapter.adapt(file);
    this.source.set(adapted);
    this.syncTranslator();
    return adapted;
  }

  useLanguage(code: string): void {
    this.chosenLang.set(code);
    this.syncTranslator();
  }

  show(mode: ViewMode): void {
    this.chosenMode.set(mode);
  }

  /** Interface strings follow the language of the content on screen. */
  private syncTranslator(): void {
    this.translator.use(untracked(this.lang));
  }
}
