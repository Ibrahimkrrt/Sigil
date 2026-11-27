import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { CvAddress } from './cv-address';

describe('CvAddress', () => {
  const at = (search: string): CvAddress => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [{ provide: DOCUMENT, useValue: { location: { search } } }] });
    return TestBed.inject(CvAddress);
  };

  it('shows cv.json when the address names no CV', () => {
    expect(at('').url()).toBe('cv.json');
    expect(at('?lang=fr').url()).toBe('cv.json');
  });

  it('shows the named CV', () => {
    expect(at('?cv=islem-louati').url()).toBe('islem-louati.cv.json');
    expect(at('?cv=Ibrahim-El-Karrat').url()).toBe('ibrahim-el-karrat.cv.json');
  });

  it('ignores anything that is not a plain name', () => {
    for (const asked of ['../secret', 'https://example.com/x', 'a/b', 'a.b', '-a', 'a--b', '%2e%2e%2fx', '']) {
      expect(at(`?cv=${encodeURIComponent(asked)}`).url()).toBe('cv.json');
    }
  });
});
