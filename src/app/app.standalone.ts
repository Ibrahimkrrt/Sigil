import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ViewerPage } from '@features/viewer/viewer-page';

/**
 * The shell of the single-file viewer: the CV page and nothing else. It has no router,
 * because a file opened from disk has no address to route on.
 */
@Component({
  selector: 'sg-root',
  imports: [ViewerPage],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<sg-viewer-page />`,
})
export class StandaloneApp {}
