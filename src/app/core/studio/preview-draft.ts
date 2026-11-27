import { LooseRecord } from '@domain/models/loose-record';
import { ViewMode } from '@domain/models/view-mode';

/** What the Studio sends to its preview: the CV being edited and how to show it. */
export interface PreviewDraft {
  readonly raw: LooseRecord;
  readonly assets: Readonly<Record<string, string>>;
  readonly lang: string;
  readonly mode: ViewMode;
}
