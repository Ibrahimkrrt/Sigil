import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, computed, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AssetResolver } from '@core/assets/asset-resolver';
import { CvAddress } from '@core/cv/state/cv-address';
import { CvLoader } from '@core/cv/state/cv-loader';
import { CvStore } from '@core/cv/state/cv-store';
import { LanguageMemory } from '@core/cv/state/language-memory';
import { LANGUAGE_NAMES } from '@core/i18n/language-names';
import { Translator } from '@core/i18n/translator';
import { ChapterTracker } from '@core/layout/chapter-tracker';
import { DocumentHead } from '@core/layout/document-head';
import { InPageNavigation } from '@core/layout/in-page-navigation';
import { LiveAnnouncer } from '@core/layout/live-announcer';
import { PageHandle } from '@core/layout/page-handle';
import { RecruiterOutline } from '@core/layout/recruiter-outline';
import { DitherLayer } from '@core/motion/dither-layer';
import { MotionSettings } from '@core/motion/motion-settings';
import { PreviewChannel } from '@core/studio/preview-channel';
import { ChapterPainter } from '@core/theme/chapter-painter';
import { ViewMode } from '@domain/models/view-mode';
import { SegmentOption } from '@ui/molecules/segmented-control/segment-option';
import { NavLink } from '@ui/organisms/site-nav/nav-link';
import { DownloadMenu } from '@ui/organisms/download-menu/download-menu';
import { IntroTitles } from '@ui/organisms/intro-titles/intro-titles';
import { SiteNav } from '@ui/organisms/site-nav/site-nav';
import { TranslatePipe } from '@ui/pipes/translate.pipe';
import { ImmersiveStory } from '@ui/templates/immersive-story/immersive-story';
import { RecruiterDocument } from '@ui/templates/recruiter-document/recruiter-document';

/** The public page: one CV, in the view and the language the reader chooses. */
@Component({
  selector: 'sg-viewer-page',
  imports: [SiteNav, IntroTitles, DownloadMenu, ImmersiveStory, RecruiterDocument, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'scv',
    '[class.no-gl]': '!dither.available()',
    '[class.is-ready]': 'ready()',
    '[class.is-entering]': 'entering',
    '[class.is-animated]': 'motion.enabled()',
    '[attr.lang]': 'store.lang()',
    '[attr.data-mode]': 'store.mode()',
    '[attr.data-density]': 'store.model()?.theme?.density',
    '[attr.data-width]': 'store.model()?.theme?.layout?.width',
    '[attr.data-tone]': 'paint()?.dark ? "dark" : "light"',
    '[attr.data-chapter]': 'store.mode() === "immersive" ? activeChapter()?.type : "recruiter"',
    '(click)': 'follow($event)',
    '[attr.data-motion]': 'motion.paused() ? "paused" : "running"',
    '[style]': 'paint()?.vars',
  },
  templateUrl: './viewer-page.html',
})
export class ViewerPage {
  protected readonly store = inject(CvStore);
  protected readonly loader = inject(CvLoader);
  private readonly address = inject(CvAddress);
  protected readonly motion = inject(MotionSettings);
  protected readonly tracker = inject(ChapterTracker);
  protected readonly announcer = inject(LiveAnnouncer);
  private readonly translator = inject(Translator);
  private readonly painter = inject(ChapterPainter);
  private readonly outline = inject(RecruiterOutline);
  private readonly head = inject(DocumentHead);
  private readonly navigation = inject(InPageNavigation);
  private readonly memory = inject(LanguageMemory);
  private readonly bar = viewChild(SiteNav);
  protected readonly dither = inject(DitherLayer);
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);

  /** The page plays its entrance once per visit, when it opens at the top with motion on. */
  /** True when this page is the Studio's live preview, fed by the Studio instead of the published file. */
  private readonly preview = inject(ActivatedRoute, { optional: true })?.snapshot.data['preview'] === true;
  protected readonly entering = this.motion.enabled() && !location.hash && !this.preview;
  /** Whether the opening titles are still on screen. */
  protected readonly titles = signal(this.entering);
  /** False until the opening titles have run. */
  protected readonly ready = signal(!this.entering);
  /** Show the pause control only when something on the page moves on its own. */
  protected readonly pausable = computed(() => {
    const effects = this.store.model()?.theme.effects;
    return this.motion.enabled() && !!effects && (this.dither.available() || effects.marquee);
  });

  protected readonly languageOptions = computed<SegmentOption[]>(() =>
    this.store.languages().all.map((code) => ({ value: code, label: code.toUpperCase(), title: LANGUAGE_NAMES[code] ?? code })));

  /** The chapter at the middle of the screen; the opening until the page has been measured. */
  protected readonly activeChapter = computed(() => {
    const chapters = this.store.chapters();
    return chapters.find((chapter) => chapter.id === this.tracker.activeId()) ?? chapters[0] ?? null;
  });

  /** The colours of the page: the whole page re-inks with the chapter in view. The recruiter document has its own. */
  protected readonly paint = computed(() => {
    const model = this.store.model();
    if (!model) return null;
    if (this.store.mode() === 'recruiter') return this.painter.paint(model.theme.inks, 'electric', 'white');
    const chapter = this.activeChapter();
    return chapter ? this.painter.paint(model.theme.inks, chapter.accent, chapter.ground) : null;
  });

  protected readonly links = computed<NavLink[]>(() => {
    const model = this.store.model();
    if (!model) return [];
    this.translator.lang();
    return this.store.mode() === 'recruiter'
      ? this.outline.links(model)
      : this.store.chapters().filter((chapter) => chapter.type !== 'hero').map((chapter) => ({ id: chapter.id, label: chapter.nav }));
  });

  /** "03 Journey": the chapter in view, for the bar. */
  protected readonly now = computed(() => {
    const chapter = this.activeChapter();
    if (!chapter || this.store.mode() !== 'immersive') return '';
    return `${String(this.store.chapters().indexOf(chapter)).padStart(2, '0')} ${chapter.nav}`;
  });


  constructor() {
    inject(PageHandle).expose('sigil', { model: () => this.store.model(), imported: () => this.store.imported(), lang: () => this.store.lang(), mode: () => this.store.mode() });
    if (this.preview) this.followStudio();
    else void this.open();
    effect(() => {
      const model = this.store.model();
      if (!model) return;
      untracked(() => {
        this.motion.useThemeAmount(model.theme.motion);
        this.head.describe(model);
        // The dither layer follows the CV: on when it asks for it, off otherwise.
        if (model.theme.effects.dither) this.dither.enable(this.element.nativeElement, model.theme.motion);
        else this.dither.disable();
        // A CV that turns the opening titles off goes straight to its entrance.
        if (!model.theme.effects.intro || !this.motion.enabled()) this.endTitles();
      });
    });
    // The layer draws in the colours of the chapter in view, and rests while the recruiter document is shown.
    effect(() => {
      const paint = this.paint();
      if (paint && this.dither.available()) this.dither.paint(paint.scene);
    });
    effect(() => this.dither.run(this.store.mode() === 'immersive'));
    inject(DestroyRef).onDestroy(() => this.dither.disable());
  }

  /** Show whatever the Studio is editing, as it is edited. */
  private followStudio(): void {
    const assets = inject(AssetResolver);
    const stop = inject(PreviewChannel).subscribe((draft) => {
      assets.use(draft.assets);
      this.store.load(draft.raw);
      this.store.useLanguage(draft.lang);
      this.store.show(draft.mode);
    });
    inject(DestroyRef).onDestroy(stop);
  }

  protected endTitles(): void {
    this.ready.set(true);
    this.titles.set(false);
  }

  /** Switch view, and start the new one from its top. The address remembers the recruiter view. */
  protected show(mode: string): void {
    this.store.show(mode as ViewMode);
    window.scrollTo({ top: 0 });
    if (!this.preview) this.navigation.remember(mode === 'recruiter' ? 'recruiter' : '');
    this.announcer.say(this.translator.t(mode === 'recruiter' ? 'Recruiter view. A conventional résumé layout.' : 'Immersive view.'));
    this.bar()?.refit();
  }

  /** A visitor's choice of language is kept for their next visit. */
  protected useLanguage(code: string): void {
    this.store.useLanguage(code);
    if (!this.preview) this.memory.keep(code);
  }

  /** In-page links scroll to their target and move focus there; they never reload or leave the page. */
  protected follow(event: Event): void {
    const root = this.element.nativeElement;
    const id = this.navigation.targetOf(event, root);
    if (!id) return;
    event.preventDefault();
    if (this.navigation.goTo(root, id) && !this.preview && this.store.mode() === 'immersive') this.navigation.remember(id);
  }

  /**
   * Load the published CV. An earlier choice of language wins over the one the page was
   * exported in, which wins over the CV's own. The address can ask for another CV
   * (?cv=name), for the recruiter view (#recruiter) or for one chapter (#skills).
   */
  private async open(): Promise<void> {
    const hash = decodeURIComponent(location.hash.slice(1));
    if (hash === 'recruiter') this.store.show('recruiter');
    const exported = await this.loader.loadPublished(this.address.url());
    const preferred = this.memory.recall() ?? exported;
    if (preferred) this.store.useLanguage(preferred);
    if (hash && hash !== 'recruiter') setTimeout(() => this.navigation.goTo(this.element.nativeElement, hash, false), 60);
  }
}
