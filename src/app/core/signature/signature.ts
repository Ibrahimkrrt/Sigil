import { Injectable } from '@angular/core';
import { mulberry } from '@domain/math/mulberry';
import { hash } from '@domain/text/hash';
import { SigilColors } from './sigil-colors';

/**
 * The signature. Every CV gets a mark and a look computed from the person (name and
 * email) and from nothing else: two people never share one, and the same person always
 * gets the same. A different seed in the theme gives a different signature.
 */
@Injectable({ providedIn: 'root' })
export class Signature {
  /** The seed a CV uses when its theme does not name one. */
  defaultSeed(name: string, email = ''): string {
    return `${name.trim().toLowerCase()}|${email.trim().toLowerCase()}`;
  }

  /** A deterministic random generator for one seed. */
  random(seed: string): () => number {
    // The "orbit:" prefix is the engine's first name. It stays, or every existing signature would change.
    return mulberry(hash(`orbit:${seed}`) || 1);
  }

  /** A short serial number for the signature: "7F3A-21C0". */
  code(seed: string): string {
    const hex = hash(`sig:${seed}`).toString(16).toUpperCase().padStart(8, '0');
    return `${hex.slice(0, 4)}-${hex.slice(4)}`;
  }

  /**
   * The mark: a grid mirrored left to right, grown from the seed. Rows of 0 and 1.
   * The rules keep it a solid glyph: no stray dots, never empty, never full.
   */
  grid(seed: string, size = 7): number[][] {
    const random = this.random(`sigil:${seed}`);
    const half = Math.ceil(size / 2);
    let grid: number[][] = [];
    for (let attempt = 0; attempt < 12; attempt++) {
      grid = Array.from({ length: size }, () => Array<number>(size).fill(0));
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < half; x++) {
          // Denser toward the centre column, so the glyph holds together.
          const on = random() < 0.34 + 0.3 * (x / (half - 1)) ? 1 : 0;
          grid[y][x] = on;
          grid[y][size - 1 - x] = on;
        }
      }
      // Remove cells with no neighbour, fill single-cell holes.
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const neighbours = (grid[y - 1]?.[x] ?? 0) + (grid[y + 1]?.[x] ?? 0) + (grid[y][x - 1] ?? 0) + (grid[y][x + 1] ?? 0);
          if (grid[y][x] && neighbours === 0) grid[y][x] = 0;
          else if (!grid[y][x] && neighbours === 4) grid[y][x] = 1;
        }
      }
      const filled = grid.flat().reduce((sum, cell) => sum + cell, 0);
      if (filled >= size * size * 0.34 && filled <= size * size * 0.7) break;
    }
    return grid;
  }

  /** The mark as SVG path data on a size by size grid. */
  path(seed: string, size = 7): string {
    return this.grid(seed, size)
      .map((row, y) => row.map((on, x) => (on ? `M${x} ${y}h1v1h-1z` : '')).join(''))
      .join('');
  }

  /** The mark as a standalone SVG document, used for the page icon. */
  svg(seed: string, colors: SigilColors = { fg: '#0B0B0D', bg: '#FF4A1C' }, size = 7): string {
    const box = size + 2;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-1 -1 ${box} ${box}" shape-rendering="crispEdges"><rect x="-1" y="-1" width="${box}" height="${box}" fill="${colors.bg}"/><path d="${this.path(seed, size)}" fill="${colors.fg}"/></svg>`;
  }

  /** One item of a list, chosen by the seed. `salt` separates independent choices. */
  pick<T>(seed: string, list: readonly T[], salt = ''): T {
    return list[Math.floor(this.random(`${salt}:${seed}`)() * list.length) % list.length];
  }

  /** The list in an order chosen by the seed. */
  shuffle<T>(seed: string, list: readonly T[], salt = ''): T[] {
    const random = this.random(`${salt}:${seed}`);
    const out = [...list];
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }
}
