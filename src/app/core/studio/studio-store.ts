import { Injectable, computed, inject, signal } from '@angular/core';
import { CvModel } from '@domain/models/cv-model';
import { LooseRecord } from '@domain/models/loose-record';
import { ViewMode } from '@domain/models/view-mode';
import { getAtPath } from '@domain/object/get-at-path';
import { setAtPath } from '@domain/object/set-at-path';
import { asRecord } from '@domain/read/as-record';
import { isRecord } from '@domain/read/is-record';
import { CvAdapter } from '../cv/import/cv-adapter';
import { CvNormalizer } from '../cv/normalize/cv-normalizer';
import { CvValidator } from '../cv/validate/cv-validator';
import { CvLocalizer } from '../i18n/cv-localizer';
import { Translator } from '../i18n/translator';
import { StudioTab } from './studio-tab';
import { ValidationReport } from './validation-report';

/**
 * The state of the Studio: the CV file being edited, its uploaded assets, and how the
 * editor is set. Every change goes through `change`, which keeps the draft saved.
 */
@Injectable({ providedIn: 'root' })
export class StudioStore {
  private readonly adapter = inject(CvAdapter);
  private readonly normalizer = inject(CvNormalizer);
  private readonly validator = inject(CvValidator);
  private readonly localizer = inject(CvLocalizer);
  private readonly translator = inject(Translator);
  private readonly draftKey = 'sigil-studio-draft-v1';

  private readonly file = signal<LooseRecord>({});
  private readonly uploaded = signal<Readonly<Record<string, string>>>({});
  private readonly name = signal('cv.json');

  /** The CV file as it would be saved. */
  readonly raw = this.file.asReadonly();
  readonly assets = this.uploaded.asReadonly();
  readonly fileName = this.name.asReadonly();
  /** The language being edited: the interface follows it, and text fields write to its translation. */
  readonly lang = signal('en');
  readonly tab = signal<StudioTab>('content');
  readonly device = signal('desktop');
  readonly mode = signal<ViewMode>('immersive');
  readonly paper = signal<'a4' | 'letter'>('a4');
  readonly appendAccessible = signal(false);

  /** The content in the language being edited. */
  readonly localized = computed(() => this.localizer.localize(this.file(), this.lang()));
  /** The model of the language being edited, hidden sections included. */
  readonly model = computed<CvModel>(() => {
    this.translator.lang();
    return this.normalizer.normalize(this.localized(), true);
  });
  /** The model as a visitor gets it: hidden sections left out. */
  readonly published = computed<CvModel>(() => {
    this.translator.lang();
    return this.normalizer.normalize(this.localized());
  });
  readonly report = computed<ValidationReport>(() => {
    this.translator.lang();
    return this.validator.validate(this.file(), { assets: this.uploaded() });
  });

  /** Start from a saved draft when there is one, otherwise from the given file. */
  open(fallback: unknown): void {
    let draft: unknown = null;
    try {
      draft = JSON.parse(localStorage.getItem(this.draftKey) ?? 'null');
    } catch {
      draft = null;
    }
    if (isRecord(draft) && isRecord(draft['raw'])) {
      this.file.set(draft['raw']);
      this.name.set(typeof draft['fileName'] === 'string' ? draft['fileName'] : 'cv.json');
    } else {
      this.file.set(asRecord(this.adapter.adapt(fallback).data));
    }
  }

  /** Replace the CV with a file in any supported format. Returns what the importer made of it. */
  load(file: unknown, fileName?: string): ReturnType<CvAdapter['adapt']> {
    const adapted = this.adapter.adapt(file);
    this.file.set(asRecord(adapted.data));
    if (fileName) this.name.set(adapted.converted ? fileName.replace(/(\.json)?$/i, '.cv.json') : fileName);
    this.save();
    return adapted;
  }

  useAssets(assets: Readonly<Record<string, string>>): void {
    this.uploaded.set(assets);
  }

  /** Edit the CV file. The editor receives a copy it may change freely. */
  change(edit: (raw: LooseRecord) => void): void {
    const next = structuredClone(this.file());
    edit(next);
    this.file.set(next);
    this.save();
  }

  /** The value of a field in the language being edited. */
  value(path: string): unknown {
    return getAtPath(this.localized(), path);
  }

  /** Write a text field. In a translated language the text goes to that translation. */
  set(path: string, value: unknown): void {
    const { base } = this.localizer.languagesOf(this.file());
    const scope = this.lang() === base ? '' : `translations.${this.lang()}.`;
    this.change((raw) => setAtPath(raw, scope + path, value));
  }

  /** Write a field that is the same in every language (a date, a photo, a theme setting). */
  setShared(path: string, value: unknown): void {
    this.change((raw) => setAtPath(raw, path, value));
  }

  /** Change a list in the CV and the same list in every translation, so their items stay aligned. */
  editList(key: string, edit: (list: unknown[], translated: boolean) => void): void {
    this.change((raw) => {
      if (!Array.isArray(raw[key])) raw[key] = [];
      edit(raw[key] as unknown[], false);
      const translations = raw['translations'];
      if (!isRecord(translations)) return;
      for (const overlay of Object.values(translations)) {
        if (isRecord(overlay) && Array.isArray(overlay[key])) edit(overlay[key] as unknown[], true);
      }
    });
  }

  private save(): void {
    try {
      localStorage.setItem(this.draftKey, JSON.stringify({ raw: this.file(), fileName: this.name() }));
    } catch {
      // Storage is unavailable or full: the draft lives for this visit only.
    }
  }
}
