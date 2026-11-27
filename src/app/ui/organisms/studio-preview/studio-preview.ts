import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, afterNextRender, computed, effect, inject, signal, viewChild } from '@angular/core';
import { Translator } from '@core/i18n/translator';
import { PreviewChannel } from '@core/studio/preview-channel';
import { PREVIEW_DEVICES } from '@core/studio/preview-devices';
import { StudioStore } from '@core/studio/studio-store';
import { ViewMode } from '@domain/models/view-mode';
import { SegmentOption } from '../../molecules/segmented-control/segment-option';
import { TranslatePipe } from '../../pipes/translate.pipe';

/**
 * The live preview: the real page, in a frame the size of the chosen device and scaled
 * to fit. Because it is a frame, the page inside has a true viewport of that size.
 */
@Component({
  selector: 'sg-studio-preview',
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'st-preview' },
  templateUrl: './studio-preview.html',
})
export class StudioPreview {
  protected readonly store = inject(StudioStore);
  private readonly channel = inject(PreviewChannel);
  private readonly translator = inject(Translator);

  protected readonly devices = computed<SegmentOption[]>(() => {
    this.translator.lang();
    return Object.entries(PREVIEW_DEVICES).map(([value, device]) => ({ value, label: this.translator.t(device.label) }));
  });
  protected readonly modes = computed<SegmentOption[]>(() => {
    this.translator.lang();
    return [
      { value: 'immersive', label: this.translator.t('Immersive') },
      { value: 'recruiter', label: this.translator.t('Recruiter') },
    ];
  });
  /** The frame's size and scale for the chosen device and the room available. */
  protected readonly frame = computed(() => {
    const device = PREVIEW_DEVICES[this.store.device()] ?? PREVIEW_DEVICES['desktop'];
    const [roomWidth, roomHeight] = this.room();
    const availableWidth = Math.max(240, roomWidth - 32);
    const availableHeight = Math.max(320, roomHeight - 32);
    const desktop = this.store.device() === 'desktop';
    const scale = Math.min(1, availableWidth / device.width, desktop ? 1 : availableHeight / device.height);
    const height = desktop ? Math.max(480, Math.round(availableHeight / scale)) : device.height;
    return { width: device.width, height, scale, percent: Math.round(scale * 100) };
  });
  private readonly room = signal<readonly [number, number]>([1200, 800]);
  private readonly viewport = viewChild.required<ElementRef<HTMLElement>>('viewport');

  constructor() {
    const destroyRef = inject(DestroyRef);
    const publish = (): void => this.channel.publish({ raw: this.store.raw(), assets: this.store.assets(), lang: this.store.lang(), mode: this.store.mode() });
    // Every change to the draft reaches the preview; a preview that has just opened asks for it.
    effect(publish);
    destroyRef.onDestroy(this.channel.onRequest(publish));
    afterNextRender(() => {
      const element = this.viewport().nativeElement;
      const measure = (): void => this.room.set([element.clientWidth, element.clientHeight]);
      const observer = new ResizeObserver(() => requestAnimationFrame(measure));
      observer.observe(element);
      measure();
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }

  protected show(mode: string): void {
    this.store.mode.set(mode as ViewMode);
  }
}
