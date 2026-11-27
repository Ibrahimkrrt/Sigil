// Before the development server starts: build the Studio's export files if they are not there yet,
// so "Standalone HTML", "Interactive web CV" and "Source code" work on a fresh checkout.
import { existsSync } from 'node:fs';
import { execSync } from 'node:child_process';

if (!existsSync('public/export/viewer.html') || !existsSync('public/export/sigil-angular-source.zip')) {
  console.log('Building the export files (once)...');
  execSync('npm run build:exports', { stdio: 'inherit' });
}
