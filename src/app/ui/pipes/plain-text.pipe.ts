import { Pipe, PipeTransform } from '@angular/core';
import { plainText } from '@domain/text/plain-text';

/** Strips rich-text markers, for places that take plain text only. */
@Pipe({ name: 'plain' })
export class PlainTextPipe implements PipeTransform {
  transform(value: string): string {
    return plainText(value);
  }
}
