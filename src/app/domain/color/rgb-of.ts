import { Rgb } from '../models/rgb';
import { hexToRgb } from './hex-to-rgb';

/** A hex colour as RGB; black when the value is not a colour. */
export function rgbOf(hex: string): Rgb {
  return hexToRgb(hex) ?? [0, 0, 0];
}
