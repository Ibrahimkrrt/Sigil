import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./features/viewer/viewer-page').then((m) => m.ViewerPage) },
  // The Studio's live preview: the same page, fed by the Studio instead of the published file.
  { path: 'preview', loadComponent: () => import('./features/viewer/viewer-page').then((m) => m.ViewerPage), data: { preview: true } },
  { path: 'studio', loadComponent: () => import('./features/studio/studio-page').then((m) => m.StudioPage) },
  { path: '**', redirectTo: '' },
];
