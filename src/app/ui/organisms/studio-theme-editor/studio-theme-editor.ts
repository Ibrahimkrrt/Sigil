import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Translator } from '@core/i18n/translator';
import { LiveAnnouncer } from '@core/layout/live-announcer';
import { Signature } from '@core/signature/signature';
import { StudioStore } from '@core/studio/studio-store';
import { ACCENT_ORDER } from '@core/theme/accent-order';
import { INK_LABELS } from '@core/theme/ink-labels';
import { INKS } from '@core/theme/inks';
import { ThemeEffects } from '@domain/models/theme-effects';
import { getAtPath } from '@domain/object/get-at-path';
import { setAtPath } from '@domain/object/set-at-path';
import { TranslatePipe } from '../../pipes/translate.pipe';

/** The Theme tab: grounds, lead ink, the signature, custom inks, motion, density, layout and effects. */
@Component({
  selector: 'sg-studio-theme-editor',
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './studio-theme-editor.html',
})
export class StudioThemeEditor {
  protected readonly store = inject(StudioStore);
  private readonly signature = inject(Signature);
  private readonly translator = inject(Translator);
  private readonly announcer = inject(LiveAnnouncer);

  protected readonly inkNames = ACCENT_ORDER;
  protected readonly inkLabels = INK_LABELS;
  protected readonly standardInks = INKS;
  protected readonly modes: readonly (readonly [string, string])[] = [['mixed', 'Mixed (signature)'], ['dark', 'Dark'], ['light', 'Light'], ['auto', 'Follow visitor']];
  protected readonly densities: readonly (readonly [string, string])[] = [['compact', 'Compact'], ['comfortable', 'Comfortable'], ['spacious', 'Spacious']];
  protected readonly effects: readonly (readonly [keyof ThemeEffects, string])[] = [
    ['dither', 'Dithered tiles (WebGL)'], ['marquee', 'Running strips'], ['physics', 'Skill pile physics'],
    ['cursor', 'Custom pointer'], ['magnetic', 'Magnetic controls'], ['intro', 'Opening titles'],
  ];

  protected readonly theme = computed(() => this.store.model().theme);
  protected readonly sigilPath = computed(() => this.signature.path(this.theme().seed));
  protected readonly motionPercent = computed(() => Math.round(this.theme().motion * 100));

  /** Write one theme setting. An empty value removes it, back to the default. */
  protected set(path: string, value: unknown): void {
    this.store.setShared(`theme.${path}`, value);
  }

  /** Choosing a lead ink also drops any custom ink order, so the rotation starts from it. */
  protected lead(ink: string): void {
    this.store.change((raw) => {
      setAtPath(raw, 'theme.lead', ink);
      setAtPath(raw, 'theme.accents', null);
    });
  }

  protected roll(): void {
    this.set('seed', Math.random().toString(36).slice(2, 8));
    this.announcer.say(this.translator.t('New signature.'));
  }

  /** Whether an ink has been replaced with the person's own colour. */
  protected custom(ink: string): boolean {
    return getAtPath(this.store.raw(), `theme.palette.${ink}`) != null;
  }
}
