import { mixRgb } from './mix-rgb';
import { rgbOf } from './rgb-of';
import { toHex } from './to-hex';

export function mixHex(a: string, b: string, t: number): string {
  return toHex(mixRgb(rgbOf(a), rgbOf(b), t));
}
