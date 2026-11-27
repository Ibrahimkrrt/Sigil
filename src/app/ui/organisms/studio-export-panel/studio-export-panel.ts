import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { AssetResolver } from '@core/assets/asset-resolver';
import { CvExporter } from '@core/export/cv-exporter';
import { SiteExporter } from '@core/export/site-exporter';
import { StudioExportKind } from '@core/export/studio-export-kind';
import { Translator } from '@core/i18n/translator';
import { StudioStore } from '@core/studio/studio-store';
import { asText } from '@domain/read/as-text';
import { TranslatePipe } from '../../pipes/translate.pipe';

/** The Export tab: the CV as a web page, as three PDF editions and as its JSON file, and how the print-ready PDF is drawn. */
@Component({
  selector: 'sg-studio-export-panel',
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './studio-export-panel.html',
})
export class StudioExportPanel {
  protected readonly store = inject(StudioStore);
  private readonly exporter = inject(CvExporter);
  private readonly site = inject(SiteExporter);
  private readonly assets = inject(AssetResolver);
  private readonly translator = inject(Translator);

  /** Every file the Studio can produce: an id, a name and what it is for. */
  protected readonly exports: readonly (readonly [StudioExportKind, string, string])[] = [
    ['web', 'Interactive web CV', 'A zip with index.html, cv.json and assets. Upload it to any static host.'],
    ['standalone', 'Standalone HTML', 'One self-contained file with content and assets embedded. Opens from disk.'],
    ['accessible', 'Accessible PDF', 'The same CV in larger type, WCAG 2.0 compatible, with AA/AAA-compliant contrast.'],
    ['print', 'Print-ready PDF', "Designed pages in the CV's own colours, with portrait and signature mark."],
    ['ats', 'ATS-friendly PDF', 'Plain single column with standard headings for applicant tracking systems.'],
    ['source', 'Source code', 'The complete, reusable engine project as a zip.'],
    ['json', 'CV JSON', 'The CV file itself. Publish it beside the page as cv.json.'],
  ];
  protected readonly pdfTheme = computed(() => this.store.model().theme.pdf);
  protected readonly status = signal('');

  protected async save(kind: StudioExportKind, label: string): Promise<void> {
    await this.run(label, async () => {
      const model = this.store.published();
      const raw = this.store.raw();
      const assets = this.store.assets();
      // The exporters read images through the asset resolver: point it at the Studio's uploads.
      this.assets.use(assets);
      switch (kind) {
        case 'web': return this.site.saveWebPackage(model, raw, assets);
        case 'standalone': return this.site.saveStandalone(model, raw, assets);
        case 'source': return this.site.saveSource();
        case 'json': return this.exporter.saveJson(raw, asText(this.store.value('profile.name')) || 'cv');
        default: return this.exporter.savePdf(model, kind, { size: this.store.paper(), append: this.store.appendAccessible() });
      }
    });
  }

  private async run(label: string, make: () => Promise<void>): Promise<void> {
    const name = this.translator.t(label);
    try {
      await make();
      this.status.set(this.translator.t('{label} ready.', { label: name }));
    } catch (error) {
      this.status.set(this.translator.t('{label} could not be exported: {message}', { label: name, message: error instanceof Error ? error.message : String(error) }));
    }
  }
}
