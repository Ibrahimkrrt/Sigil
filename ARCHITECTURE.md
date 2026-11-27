# Sigil CV, Angular edition: architecture

This is the Angular port of Sigil CV. The framework-free engine remains the reference
implementation until this port reaches parity; `src/testing/parity-fixtures.json` holds
what the reference makes of every example CV, and the unit tests hold this port to it.

## Rules

1. **One thing per file.** Every `.ts` file declares and exports exactly one class,
   function, type or constant. `npm run check:structure` enforces it.
2. **Singletons for logic and state.** Every service is `providedIn: 'root'` and obtained
   with `inject()`. Components hold no business logic.
3. **Single responsibility per class and per folder.** A class name says the one thing
   it does (`ThemeResolver`, `PositionBuilder`, `ChapterPainter`). A folder holds one concern.
4. **Standalone, signal-based, OnPush.** No NgModules. Inputs are `input()`, state is
   signals, derived state is `computed()`, templates use the built-in control flow.
5. **Dependencies point inward.** `domain` imports nothing from Angular. `core` imports
   `domain`. `ui` imports `core` and `domain`. `features` import all three. Nothing imports `features`.
6. **Content is never HTML.** CV text reaches the page as text nodes through tokens
   (`parseRich`), and addresses pass `safeUrl`.

## Layers

| Folder | Role | Angular? |
|---|---|---|
| `src/app/domain/` | The CV model (`models/`), and pure functions on text, colour, numbers and loose JSON. | No |
| `src/app/core/` | Singleton services: import, normalisation, translation, signature, inks, assets, state. | Services only |
| `src/app/ui/` | Presentational building blocks in atomic design order, and pipes. | Components |
| `src/app/features/` | Routed pages that connect state to templates. | Components |

### Atomic design in `ui/`

| Level | Meaning here | Examples |
|---|---|---|
| `atoms/` | One element with one behaviour. No knowledge of the CV. | `RichText`, `ExternalLink` |
| `molecules/` | A few atoms that form one reusable unit. | `RecruiterSection`, `RecruiterItem`, `TagList`, `ContactList`, `SegmentedControl` |
| `organisms/` | A complete part of a page, bound to one part of the CV model. | `RecruiterHeader`, `RecruiterExperience`, `RecruiterSkills` |
| `templates/` | A page layout that arranges organisms and takes the whole model. | `RecruiterDocument` |
| pages (`features/`) | A template connected to state and routing. | `ViewerPage` |

### The content pipeline in `core/cv/`

`CvStore.load(file)` → `CvAdapter` (Sigil, JSON Resume or any other CV JSON, to Sigil's format)
→ `CvLocalizer` (translation overlay) → `CvNormalizer` (a complete `CvModel`; delegates to
`ExperienceReader`, `PositionBuilder`, `ArchetypeDetector`, `ThemeResolver`, `SectionResolver`)
→ `ChapterInkAssigner` (ink and ground per chapter) → `ChapterPainter` (colours of one chapter).

## Styles

The identity stylesheet lives in `src/styles/blocks/`, one partial per block (`_nav.scss`,
`_hero.scss`, `_matrix.scss`…), generated from the reference stylesheet by
`tools/split-styles.py` and loaded by `src/styles.scss`. Class names follow BEM
(`block__element--modifier`), which is what keeps them from colliding; immersive components
use these classes and carry no styles of their own. The recruiter components predate this
and keep small scoped styles.

Components that must not add a box of their own are attached to native elements with
attribute selectors (`li[sgRoleStop]`, `header[sgChapterHeader]`, `figure[sgDataChart]`),
so lists stay lists and the markup stays valid.

## Engines lifted from the reference

The parts of Sigil that are imperative by nature (the WebGL dither layer, the moon film,
the rigid-body skill pile, pointer and type effects, the tagged-PDF writer and the PDF
layouts, the validator) were not rewritten by hand. `tools/lift.mjs` turns each reference
module into one injectable class: top-level functions become methods, top-level constants
become fields, and the bodies are carried over unchanged, so behaviour is the reference's.
They live in `core/engine/`, `core/export/` and `core/cv/validate/`.

Two honest limits of that choice. Inside these classes values are typed `any`: they are
typed at their boundary by the hand-written services that call them (`DitherLayer`,
`EffectsInstaller`, `CvExporter`, `StudioStore`), not within. And they are generated
files: change the reference and run `npm run lift`, or adopt a file by hand and remove it
from the lift configuration.

Effects are installed on the rendered page by `EffectsInstaller`, which finds each one by
the hook its element carries in the template (`data-scramble`, `data-drag`, `.marquee`…).

## Studio and its preview

`/studio` is the editor; its state is `StudioStore`. The live preview is the real page at
`/preview` in a frame, so it has a true viewport of the chosen device size; the draft
reaches it over a `BroadcastChannel` (`PreviewChannel`).

The Studio is part of the default build. `npm run build:public` builds the CV alone, with
the Studio and its preview left out of the bundle, into `dist/public`.

Both builds are single-page applications: the host must answer unknown paths with
`index.html` (`npm run serve:dist` does this locally).

## Which CV is shown

`CvAddress` answers that: `cv.json` by default, or `<name>.cv.json` when the address says
`?cv=<name>` (letters, digits and hyphens only, so the address cannot point anywhere else).
`public/` ships the demo as `cv.json` and two real CVs, `ibrahim-el-karrat.cv.json` and
`islem-louati.cv.json`; every image a CV names is a path under `public/assets/`, and a
missing file falls back to a generated pattern instead of a broken picture. Both builds
publish everything in `public/`: remove a CV and its images before deploying if it should
not be public.

## The single-file viewer and the web exports

A routed, code-split Angular build is a folder of files, so it cannot be the "one HTML file
that opens from disk" the Studio exports. A third build configuration, `standalone`, makes
that file: it starts from `src/main.standalone.ts`, which bootstraps the CV page alone
(`StandaloneApp`, no router, because a file on disk has no address to route on), and emits
one script and one stylesheet. `tools/pack-viewer.mjs` inlines the two into
`public/export/viewer.html`, a page with four placeholders: title, language, CV and assets.

In the Studio, `ExportKit` fetches that page, `ViewerTemplate` fills it, and `SiteExporter`
saves either the one self-contained file, or a zip (`domain/zip`) with the same page left
empty, `cv.json` and the asset files. At run time `EmbeddedCv` reads the CV from the page;
when there is none, `CvLoader` fetches `cv.json` beside it. The page has no `<base>`, so
the package works from any folder of a static host.

`tools/pack-source.mjs` zips the project for the Studio's "Source code" export, using the
application's own zip function. The personal CVs in `public/` and their images are left
out of that archive; the demo stays in. Both generated files live in `public/export/`, are rebuilt
by `npm run build` (its `prebuild` step is `npm run build:exports`), and are left out of
the public build. `npm start` builds them once if they are missing (`tools/ensure-exports.mjs`);
run `npm run build:exports` to refresh them after changing the viewer.

## Tests

- `npm test`: unit tests. 18 parity cases compare the importer, normaliser, translations,
  signature and inks with the reference engine's output; the zip writer and the viewer
  template have their own.
- `npm run e2e`: the reference's browser suite, ported (`e2e/run.mjs`). It serves the
  production builds, drives them with Playwright and checks rendering of the demo and
  eight example CVs, keyboard use, focus, announcements, reduced motion, reflow at
  320 px, text spacing, both languages, the
  Studio, every export (PDFs with `qpdf`, `pdfinfo`, `pdftotext`; the single file opened
  from disk; the web package served from a subfolder) and runs axe-core on each state.
  It needs Playwright with Chromium, and poppler, qpdf and unzip on the path. Results are
  written to `E2E-RESULTS.md`.
- `npm run check:structure`: the one-thing-per-file rule.

## Port status

| Part | Status |
|---|---|
| Domain model, importer, normaliser, translations, signature, inks | Done, 18 parity tests against the reference |
| Recruiter view | Done |
| Immersive view: navigation, chapters, journey, roles chart, deep dives, case studies, custom blocks | Done |
| Motion: dither layer, opening titles, scramble, pointer, magnetic controls, running strips, reading sweep, counters, drag, skill pile, pause control, hidden interactions, moon film | Done (lifted engines) |
| Exports: ATS, accessible and print-ready PDFs (with the "add the accessible version?" prompt), CV JSON | Done; PDF text is identical to the reference's |
| Exports: standalone HTML, interactive web CV (zip), source code (zip) | Done |
| Sigil Studio: content, sections, theme, assets, JSON with validation, export, live preview at three sizes, draft autosave, English and French | Done |
| Browser tests | Done: the reference's suite, ported |

One deliberate difference from the reference: this edition renders one view at a time.
Switching between the immersive and the recruiter view replaces the page's content; the
reference keeps both in the document and hides one.

## Commands

- `npm start`: development server.
- `npm run build`: production build in `dist/sigil-angular`, Studio included. Runs `build:exports` first.
- `npm run build:exports`: the single-file viewer and the source archive, into `public/export/`.
- `npm run build:public`: the CV alone, without the Studio or the export files, in `dist/public`.
- `npm run serve:dist`: serve the build locally with the single-page fallback.
- `npm run lift`: regenerate the lifted engines from the reference.
- `npm test`, `npm run e2e`, `npm run check:structure`: see Tests.
- `npm run fixtures -- <path to the reference engine>`: regenerate the parity fixtures.
