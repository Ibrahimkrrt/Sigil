import { LooseRecord } from '../models/loose-record';

/** The value as a JSON object, or an empty object when it is anything else. */
export function asRecord(value: unknown): LooseRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? (value as LooseRecord) : {};
}
