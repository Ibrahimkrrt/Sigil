import { Injectable } from '@angular/core';
import { LooseRecord } from '@domain/models/loose-record';
import { isRecord } from '@domain/read/is-record';

/** Finds a value under any of several key names, compared without case, spaces or punctuation. */
@Injectable({ providedIn: 'root' })
export class FieldPicker {
  private readonly cache = new WeakMap<LooseRecord, Map<string, unknown>>();

  /** The first non-empty value among the given key names (written lower-case, letters and digits only). */
  pick(source: unknown, ...names: string[]): unknown {
    if (!isRecord(source)) return undefined;
    let byKey = this.cache.get(source);
    if (!byKey) {
      byKey = new Map(Object.keys(source).map((key) => [key.toLowerCase().replace(/[^a-z0-9]/g, ''), source[key]]));
      this.cache.set(source, byKey);
    }
    for (const name of names) {
      const value = byKey.get(name);
      if (value != null && value !== '') return value;
    }
    return undefined;
  }
}
