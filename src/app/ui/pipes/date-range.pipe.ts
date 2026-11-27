import { Pipe, PipeTransform, inject } from '@angular/core';
import { DateFormatter } from '@core/format/date-formatter';

/** A period as text: `{{ start | dateRange: end : true : 'Present' }}`. Follows language changes. */
@Pipe({ name: 'dateRange', pure: false })
export class DateRangePipe implements PipeTransform {
  private readonly formatter = inject(DateFormatter);

  transform(start: string, end: string, month = false, present?: string): string {
    return this.formatter.range(start, end, month, present);
  }
}
