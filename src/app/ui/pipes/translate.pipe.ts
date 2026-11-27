import { Pipe, PipeTransform, inject } from '@angular/core';
import { Translator } from '@core/i18n/translator';

/** Translates an interface string: `{{ 'Download CV' | t }}`. Follows language changes. */
@Pipe({ name: 't', pure: false })
export class TranslatePipe implements PipeTransform {
  private readonly translator = inject(Translator);

  transform(source: string, vars?: Readonly<Record<string, string | number | null | undefined>>): string {
    return this.translator.t(source, vars);
  }
}
