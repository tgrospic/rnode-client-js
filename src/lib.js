export const encodeBase16 = bytes =>
  Array.from(bytes).map(x => (x & 0xff).toString(16).padStart(2, 0)).join('')

export const decodeBase16 = hexStr => {
  const removed0x = hexStr.replace(/^0x/, '')
  const byte2hex = ([arr, bhi], x) =>
    bhi ? [[...arr, parseInt(`${bhi}${x}`, 16)]] : [arr, x]
  const [resArr] = Array.from(removed0x).reduce(byte2hex, [[]])
  return Uint8Array.from(resArr)
}

export const decodeAscii = (str = '') =>
  Array.from(str).map(x => `${x}`.charCodeAt(0))
