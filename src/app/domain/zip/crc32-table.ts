/** The lookup table of the CRC-32 checksum a zip archive stores for each file. */
export const CRC32_TABLE: Uint32Array = Uint32Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});
