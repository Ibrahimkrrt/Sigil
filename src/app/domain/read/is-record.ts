import { LooseRecord } from '../models/loose-record';

export function isRecord(value: unknown): value is LooseRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
