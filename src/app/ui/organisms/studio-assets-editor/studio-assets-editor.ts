import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Translator } from '@core/i18n/translator';
import { LiveAnnouncer } from '@core/layout/live-announcer';
import { StudioStore } from '@core/studio/studio-store';
import { asText } from '@domain/read/as-text';
import { TranslatePipe } from '../../pipes/translate.pipe';

/** The Assets tab: images and video uploaded into the browser, and which one is the portrait. */
@Component({
  selector: 'sg-studio-assets-editor',
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './studio-assets-editor.html',
})
export class StudioAssetsEditor {
  protected readonly store = inject(StudioStore);
  private readonly translator = inject(Translator);
  private readonly announcer = inject(LiveAnnouncer);

  protected readonly entries = computed(() => Object.entries(this.store.assets()).map(([path, url]) => ({
    path, url,
    image: /^data:image\//.test(url),
    size: `${Math.max(1, Math.round((url.length * 0.75) / 1024))} KB`,
  })));
  protected readonly hasPortrait = computed(() => this.store.value('profile.photo') != null);

  protected async upload(input: HTMLInputElement): Promise<void> {
    const assets = { ...this.store.assets() };
    let added = 0;
    for (const file of Array.from(input.files ?? [])) {
      if (file.size > 8_000_000) {
        this.announcer.say(this.translator.t('{name} is larger than 8 MB and was skipped.', { name: file.name }));
        continue;
      }
      assets[`assets/${file.name.replace(/[^\w.-]+/g, '-')}`] = await this.read(file);
      added++;
    }
    input.value = '';
    this.store.useAssets(assets);
    this.announcer.say(this.translator.t(added === 1 ? '{n} asset added.' : '{n} assets added.', { n: added }));
  }

  protected usePortrait(path: string): void {
    const name = asText(this.store.value('profile.name')) || this.translator.t('the candidate');
    this.store.setShared('profile.photo', { src: path, alt: this.translator.t('Portrait of {name}', { name }) });
    this.announcer.say(this.translator.t('Portrait set. Edit its alt text in the JSON tab.'));
  }

  protected remove(path: string): void {
    const { [path]: _removed, ...rest } = this.store.assets();
    this.store.useAssets(rest);
  }

  private read(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }
}
