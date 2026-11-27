import { LooseRecord } from './loose-record';
import { SectionType } from './section-type';
import { ViewMode } from './view-mode';

/** One chapter of the page, resolved from the CV's `sections` or from the default order. */
export interface CvSection {
  readonly id: string;
  readonly type: SectionType;
  readonly sourceType: string;
  readonly builtIn: boolean;
  readonly hidden: boolean;
  readonly entry: LooseRecord;
  readonly title: string;
  readonly nav: string;
  readonly intro: string;
  readonly text: string;
  readonly blocks: readonly LooseRecord[];
  readonly accent: string | null;
  readonly ground: string | null;
  readonly modes: readonly ViewMode[];
  readonly options: LooseRecord;
}
