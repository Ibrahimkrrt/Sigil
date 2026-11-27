import { CvFact } from './cv-fact';
import { CvImage } from './cv-image';
import { CvQuote } from './cv-quote';

export interface CvProfile {
  readonly name: string;
  readonly given: string;
  readonly family: string;
  readonly initials: string;
  readonly headline: string;
  readonly tagline: string;
  readonly location: string;
  readonly summary: readonly string[];
  readonly facts: readonly CvFact[];
  readonly quote: CvQuote | null;
  readonly photo: CvImage | null;
  readonly photos: readonly CvImage[];
}
