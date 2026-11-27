import { Injectable, inject } from '@angular/core';
import { CvChapter } from '@domain/models/cv-chapter';
import { CvSection } from '@domain/models/cv-section';
import { CvTheme } from '@domain/models/cv-theme';
import { InkPalette } from '../../theme/ink-palette';

/** Gives each section its ink and its ground: one ink per chapter, rotating. */
@Injectable({ providedIn: 'root' })
export class ChapterInkAssigner {
  private readonly palette = inject(InkPalette);

  assign(sections: readonly CvSection[], theme: CvTheme, prefersDark = false): CvChapter[] {
    const mode = theme.mode === 'auto' ? (prefersDark ? 'dark' : 'mixed') : theme.mode;
    let turn = 0;
    return sections.map((section, index) => {
      let accent = section.accent ? this.palette.inkName(section.accent, theme.inks) : null;
      if (!accent) {
        // Opening, story and contact carry the lead ink; chapters between them rotate.
        const leads = section.type === 'hero' || section.type === 'contact' || (section.type === 'summary' && index <= 1);
        accent = leads ? theme.lead : theme.rotation[++turn % theme.rotation.length];
      }
      let ground = section.ground ? this.palette.groundName(section.ground) : null;
      if (!ground) {
        // The opening and the close share the night ground; chapters between take the ground their ink reads best on.
        const bookend = mode === 'mixed' && (section.type === 'hero' || section.type === 'contact');
        ground = bookend ? 'night' : this.palette.groundFor(accent, mode, index % 2 === 1);
      }
      return { ...section, accent, ground };
    });
  }
}
