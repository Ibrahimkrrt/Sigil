# Sigil CV, Angular edition

The Angular port of Sigil CV: a CV engine that turns one JSON file into an immersive
portfolio, a recruiter document, three PDF editions, a single-file web page, and an editor (Sigil Studio).

Live CV: https://ibrahimkrrt.github.io/Sigil/

- `npm install`, then `npm start` and open http://localhost:4200 (the CV) or `/studio` (the editor).
- The CV shown is `public/cv.json`, with its images in `public/assets/`.
- Other CVs can sit beside it as `public/<name>.cv.json` and open with `?cv=<name>`.
  Those files are git-ignored, so they stay local.
- `npm run build` makes the production build; `npm test` and `npm run e2e` test it.
- `ARCHITECTURE.md` explains the structure, the rules the code follows, the builds and the tests.

## Deployment

GitHub Pages serves the CV only. `.github/workflows/pages.yml` runs on every push to `main`
and builds `--configuration public`, which leaves the Studio and its preview out of the bundle,
then fails if any Studio code shows up in the output. The Studio is local only: run it with `npm start`.

Proprietary. See `LICENSE`.
