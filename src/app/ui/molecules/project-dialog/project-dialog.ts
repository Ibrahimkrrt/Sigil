import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, input } from '@angular/core';
import { CvImage } from '@domain/models/cv-image';
import { CvProject } from '@domain/models/cv-project';
import { ArrowIcon } from '../../atoms/arrow-icon/arrow-icon';
import { CvPicture } from '../../atoms/cv-picture/cv-picture';
import { ExternalLink } from '../../atoms/external-link/external-link';
import { RichText } from '../../atoms/rich-text/rich-text';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { ChipList } from '../chip-list/chip-list';
import { Tile } from '../tile-list/tile';
import { TileList } from '../tile-list/tile-list';

/** A project's case study, in a modal dialog: summary, outcome, figures, process and images. */
@Component({
  selector: 'dialog[sgProjectDialog]',
  exportAs: 'sgProjectDialog',
  imports: [ArrowIcon, CvPicture, ExternalLink, RichText, ChipList, TileList, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'case', '[attr.aria-labelledby]': '"case-" + project().id + "-title"', '(click)': 'closeOnBackdrop($event)' },
  templateUrl: './project-dialog.html',
})
export class ProjectDialog {
  private readonly element = inject<ElementRef<HTMLDialogElement>>(ElementRef);
  readonly project = input.required<CvProject>();
  protected readonly meta = computed(() => [this.project().role, this.project().year].filter(Boolean).join(' · '));
  protected readonly media = computed(() => [this.project().image, ...this.project().gallery].filter((image): image is CvImage => image !== null));
  protected readonly tiles = computed<Tile[]>(() => this.project().stats.map((stat) => ({ label: stat.label, value: stat.value })));

  open(): void {
    this.element.nativeElement.showModal();
  }

  protected close(): void {
    this.element.nativeElement.close();
  }

  /** A click on the dimmed area around the dialog closes it. */
  protected closeOnBackdrop(event: MouseEvent): void {
    if (event.target === this.element.nativeElement) this.close();
  }
}
