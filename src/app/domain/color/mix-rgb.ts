import { Rgb } from '../models/rgb';

/** Linear blend from `a` to `b`; `t` is 0 for all `a`, 1 for all `b`. */
export function mixRgb(a: Rgb, b: Rgb, t: number): Rgb {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}
