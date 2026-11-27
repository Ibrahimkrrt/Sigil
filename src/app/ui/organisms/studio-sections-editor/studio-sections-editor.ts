import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ChapterInkAssigner } from '@core/cv/normalize/chapter-ink-assigner';
import { Translator } from '@core/i18n/translator';
import { LiveAnnouncer } from '@core/layout/live-announcer';
import { StudioStore } from '@core/studio/studio-store';
import { ACCENT_ORDER } from '@core/theme/accent-order';
import { GROUND_LABELS } from '@core/theme/ground-labels';
import { INK_LABELS } from '@core/theme/ink-labels';
import { INKS } from '@core/theme/inks';
import { CvSection } from '@domain/models/cv-section';
import { asText } from '@domain/read/as-text';
import { TranslatePipe } from '../../pipes/translate.pipe';

/** The Sections tab: the order, visibility, title, ink and ground of each chapter. */
@Component({
  selector: 'sg-studio-sections-editor',
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './studio-sections-editor.html',
})
export class StudioSectionsEditor {
  protected readonly store = inject(StudioStore);
  private readonly assigner = inject(ChapterInkAssigner);
  private readonly translator = inject(Translator);
  private readonly announcer = inject(LiveAnnouncer);
  protected readonly inkNames = ACCENT_ORDER;
  protected readonly inkLabels = INK_LABELS;
  protected readonly groundNames = Object.keys(GROUND_LABELS);
  protected readonly groundLabels = GROUND_LABELS;

  protected readonly sections = computed(() => this.store.model().sections);
  private readonly inked = computed(() => this.assigner.assign(this.sections().filter((section) => !section.hidden), this.store.model().theme));

  /** The colour of the dot beside a section: its chosen ink, or the one the rotation gives it. */
  protected dot(section: CvSection): string {
    const name = asText(section.entry['accent']) || this.inked().find((chapter) => chapter.id === section.id)?.accent || 'night';
    const ink = INKS[name] ?? INKS['night'];
    return `linear-gradient(150deg, ${ink.shoulder}, ${ink.base} 65%)`;
  }

  protected option(section: CvSection, key: string): string {
    return asText(section.entry[key]);
  }

  protected move(index: number, by: number): void {
    const target = index + by;
    if (target < 1 || target >= this.sections().length) return;
    const name = this.sections()[index].nav;
    this.rewrite((list) => list.splice(target, 0, list.splice(index, 1)[0]));
    this.announcer.say(this.translator.t(by < 0 ? '{name} moved up.' : '{name} moved down.', { name }));
  }

  /** Set or clear one option of a section. An empty value goes back to automatic. */
  protected patch(index: number, key: string, value: unknown): void {
    this.rewrite((list) => {
      if (value === '' || value == null) delete list[index][key];
      else list[index][key] = value;
    });
  }

  protected reset(): void {
    this.store.change((raw) => delete raw['sections']);
    this.announcer.say(this.translator.t('Section order reset.'));
  }

  /** Write the section list out in full (it may have been automatic until now), then edit it. */
  private rewrite(edit: (list: Record<string, unknown>[]) => void): void {
    const list = this.sections().map((section) => ({ ...section.entry }));
    edit(list);
    this.store.change((raw) => (raw['sections'] = list));
  }
}
