import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, ViewEncapsulation, computed, effect, inject, viewChild } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { LANGUAGE_NAMES } from '@core/i18n/language-names';
import { Translator } from '@core/i18n/translator';
import { LiveAnnouncer } from '@core/layout/live-announcer';
import { PageHandle } from '@core/layout/page-handle';
import { STUDIO_FR_MESSAGES } from '@core/studio/studio-fr-messages';
import { StudioStore } from '@core/studio/studio-store';
import { StudioTab } from '@core/studio/studio-tab';
import { STUDIO_TABS } from '@core/studio/studio-tabs';
import { StudioAssetsEditor } from '@ui/organisms/studio-assets-editor/studio-assets-editor';
import { StudioContentEditor } from '@ui/organisms/studio-content-editor/studio-content-editor';
import { StudioExportPanel } from '@ui/organisms/studio-export-panel/studio-export-panel';
import { StudioJsonEditor } from '@ui/organisms/studio-json-editor/studio-json-editor';
import { StudioPreview } from '@ui/organisms/studio-preview/studio-preview';
import { StudioSectionsEditor } from '@ui/organisms/studio-sections-editor/studio-sections-editor';
import { StudioThemeEditor } from '@ui/organisms/studio-theme-editor/studio-theme-editor';
import { TranslatePipe } from '@ui/pipes/translate.pipe';

/** Sigil Studio: edit a CV file with a live preview, check it, and export it. */
@Component({
  selector: 'sg-studio-page',
  imports: [StudioContentEditor, StudioSectionsEditor, StudioThemeEditor, StudioAssetsEditor, StudioJsonEditor, StudioExportPanel, StudioPreview, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // The Studio's stylesheet is one identity sheet for the whole page, loaded only with it.
  encapsulation: ViewEncapsulation.None,
  host: { class: 'st', '[attr.lang]': 'store.lang()' },
  templateUrl: './studio-page.html',
  styleUrl: './studio-page.scss',
})
export class StudioPage {
  protected readonly store = inject(StudioStore);
  protected readonly announcer = inject(LiveAnnouncer);
  private readonly translator = inject(Translator);
  private readonly http = inject(HttpClient);

  protected readonly tabs = STUDIO_TABS;
  protected readonly languages = Object.entries(LANGUAGE_NAMES);
  protected readonly status = computed(() => {
    this.translator.lang();
    const { errors, warnings } = this.store.report();
    if (!errors.length) return this.translator.t('Valid. {w} hints', { w: warnings.length });
    return this.translator.t(errors.length === 1 ? '{e} error, {w} hints' : '{e} errors, {w} hints', { e: errors.length, w: warnings.length });
  });
  private readonly json = viewChild.required(StudioJsonEditor);
  private demo: unknown = {};

  constructor() {
    this.translator.add('fr', STUDIO_FR_MESSAGES);
    inject(PageHandle).expose('sigilStudio', { raw: () => this.store.raw(), report: () => this.store.report() });
    // The interface follows the language being edited.
    effect(() => this.translator.use(this.store.lang()));
    void this.start();
  }

  protected select(tab: StudioTab, focus = false): void {
    this.store.tab.set(tab);
    if (focus) setTimeout(() => document.getElementById(`st-tab-${tab}`)?.focus());
  }

  /** Arrow keys move between tabs, as a tab list should. */
  protected step(index: number, by: number): void {
    this.select(this.tabs[(index + by + this.tabs.length) % this.tabs.length][0], true);
  }

  protected async upload(input: HTMLInputElement): Promise<void> {
    const file = input.files?.[0];
    if (!file) return;
    const accepted = this.json().apply(await file.text(), file.name);
    input.value = '';
    if (accepted) this.announcer.say(this.translator.t('{name} loaded.', { name: file.name }));
    else this.select('json', true);
  }

  protected paste(): void {
    this.select('json');
    setTimeout(() => this.json().focus());
    this.announcer.say(this.translator.t('Paste your JSON into the editor.'));
  }

  protected loadDemo(): void {
    this.store.load(this.demo, 'cv.json');
    this.store.useAssets({});
    this.announcer.say(this.translator.t('Demonstration profile loaded.'));
  }

  protected showIssues(): void {
    this.select('json', true);
    setTimeout(() => document.getElementById('st-issues')?.scrollIntoView({ block: 'nearest' }));
  }

  /** Open the saved draft, or the published CV when there is none. */
  private async start(): Promise<void> {
    try {
      this.demo = await firstValueFrom(this.http.get<unknown>('cv.json'));
    } catch {
      this.demo = {};
    }
    this.store.open(this.demo);
  }
}
