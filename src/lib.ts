import base58 from 'bs58'

/**
 * Encode bytes to base 16 string.
 */
export const encodeBase16 = (bytes: Uint8Array | number[]) =>
  Array.from(bytes).map(x => (x & 0xff).toString(16).padStart(2, '0')).join('')

/**
 * Decode base 16 string to bytes.
 */
export const decodeBase16 = (hexStr: string) => {
  const removed0x = hexStr.replace(/^0x/, '')
  const byte2hex = ([arr, bhi]: [number[], string], x: string) =>
    (bhi ? [[...arr, parseInt(`${bhi}${x}`, 16)], ''] : [arr, x]) as [number[], string]
  const [resArr] = Array.from(removed0x).reduce(byte2hex, [[], ''])
  return Uint8Array.from(resArr)
}

/**
 * Encode base 16 string to base 58.
 */
export const encodeBase58 = (hexStr: string) => {
  const bytes = decodeBase16(hexStr)
  return base58.encode(bytes)
}

/**
 * Decode base 58 string (handle errors).
 */
export const decodeBase58safe = (str: string) =>
  { try { return base58.decode(str) } catch { return void 666 } }

/**
 * Decode ASCII string to bytes.
 */
export const decodeAscii = (str = '') =>
  Array.from(str).map(x => `${x}`.charCodeAt(0))
