import { Routes } from '@angular/router';

/** The routes of the public build: the CV only. The Studio and its preview are left out of the bundle. */
export const routes: Routes = [
  { path: '', loadComponent: () => import('./features/viewer/viewer-page').then((m) => m.ViewerPage) },
  { path: '**', redirectTo: '' },
];
