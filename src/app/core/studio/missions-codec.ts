import { isRecord } from '@domain/read/is-record';
import { FieldCodec } from './field-codec';

/** Missions, one per line. A line may end with #role tags, which place it under those roles. */
export const MISSIONS_CODEC: FieldCodec = {
  read: (value) => (Array.isArray(value)
    ? value.map((item) => (isRecord(item)
      ? `${typeof item['text'] === 'string' ? item['text'] : ''}${(Array.isArray(item['roles']) ? item['roles'] : []).map((role) => ` #${String(role)}`).join('')}`
      : String(item ?? ''))).join('\n')
    : ''),
  write: (text) => text.split('\n').map((line) => line.trim()).filter(Boolean).map((line) => {
    const tagged = /^(.*?)((?:\s+#[\w-]+)+)$/.exec(line);
    return tagged ? { text: tagged[1].trim(), roles: tagged[2].trim().split(/\s+/).map((role) => role.slice(1)) } : line;
  }),
};
