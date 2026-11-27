import { bootstrapApplication } from '@angular/platform-browser';
import { standaloneConfig } from './app/app.config.standalone';
import { StandaloneApp } from './app/app.standalone';

bootstrapApplication(StandaloneApp, standaloneConfig)
  .catch((err) => console.error(err));
