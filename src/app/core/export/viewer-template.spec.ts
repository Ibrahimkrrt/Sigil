import { TestBed } from '@angular/core/testing';
import { CvStore } from '../cv/state/cv-store';
import { ViewerTemplate } from './viewer-template';

describe('ViewerTemplate', () => {
  const page = '<html lang="en" data-sigil-lang><head><title>Sigil CV</title></head><body><script type="application/json" id="sigil-data">"__SIGIL_DATA__"</script><script type="application/json" id="sigil-assets">"__SIGIL_ASSETS__"</script></body></html>';
  const raw = { profile: { name: 'Ada <b>$&</b> Lovelace', headline: 'Analyst </script><script>alert(1)</script>' } };

  const fill = (data: Record<string, unknown> | null, assets = {}): string => {
    const store = TestBed.inject(CvStore);
    store.load(raw);
    const model = store.model();
    if (!model) throw new Error('the CV did not load');
    return TestBed.inject(ViewerTemplate).fill(page, model, data, assets);
  };

  it('embeds the CV so that nothing in it can leave its script element', () => {
    const html = fill(raw, { 'assets/a.svg': 'data:image/svg+xml;base64,AA==' });
    expect(html).not.toContain('</script><script>alert(1)');
    expect(html).toContain('\\u003c/script>');
    expect(html).toContain('"assets/a.svg"');
    expect(html).toContain('$&');
    const island = /id="sigil-data">(.*?)<\/script>/.exec(html)?.[1] ?? '';
    expect(JSON.parse(island)).toEqual(raw);
  });

  it('escapes the title and leaves the data empty for a page that loads cv.json', () => {
    const html = fill(null);
    expect(html).toContain('<title>Ada &lt;b&gt;$&amp;&lt;/b&gt; Lovelace');
    expect(html).toContain('id="sigil-data">""</script>');
    expect(html).toContain('id="sigil-assets">{}</script>');
    expect(html).toContain('application/ld+json');
  });
});
