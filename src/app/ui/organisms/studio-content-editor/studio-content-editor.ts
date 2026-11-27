import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { LiveAnnouncer } from '@core/layout/live-announcer';
import { Translator } from '@core/i18n/translator';
import { MISSIONS_CODEC } from '@core/studio/missions-codec';
import { PARAGRAPHS_CODEC } from '@core/studio/paragraphs-codec';
import { StudioStore } from '@core/studio/studio-store';
import { asList } from '@domain/read/as-list';
import { asRecord } from '@domain/read/as-record';
import { asText } from '@domain/read/as-text';
import { StudioField } from '../../molecules/studio-field/studio-field';
import { TranslatePipe } from '../../pipes/translate.pipe';

/** The Content tab: who the person is, how to reach them, and their experience entries. */
@Component({
  selector: 'sg-studio-content-editor',
  imports: [StudioField, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './studio-content-editor.html',
})
export class StudioContentEditor {
  protected readonly store = inject(StudioStore);
  private readonly translator = inject(Translator);
  private readonly announcer = inject(LiveAnnouncer);
  protected readonly paragraphs = PARAGRAPHS_CODEC;
  protected readonly missions = MISSIONS_CODEC;

  /** A heading for each experience entry, from the language being edited. */
  protected readonly entries = computed(() =>
    asList(this.store.localized()['experience']).map((entry) => {
      const e = asRecord(entry);
      return [asText(e['role']), asText(e['company'])].filter(Boolean).join(', ') || this.translator.t('New role');
    }));

  protected add(): void {
    this.store.editList('experience', (list, translated) => list.unshift(translated ? null : { role: '', company: '', start: '' }));
    this.announcer.say(this.translator.t('Role added.'));
  }

  protected move(index: number, by: number): void {
    this.store.editList('experience', (list) => {
      const target = index + by;
      while (list.length <= Math.max(index, target)) list.push(null);
      list.splice(target, 0, list.splice(index, 1)[0]);
    });
  }

  protected remove(index: number): void {
    this.store.editList('experience', (list) => {
      if (index < list.length) list.splice(index, 1);
    });
    this.announcer.say(this.translator.t('Role removed.'));
  }
}
