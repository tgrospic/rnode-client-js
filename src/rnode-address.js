import { keccak256 } from 'js-sha3'
import blake from 'blakejs'
import base58 from 'base-58'

// Algorithm to generate ETH and REV address is taken from RNode source
// https://github.com/rchain/rchain/blob/bf7a30e1d388d46aa9e5f4b8c04089fc8e31d771/rholang/src/main/scala/coop/rchain/rholang/interpreter/util/AddressTools.scala#L47

// Prefix as defined in https://github.com/rchain/rchain/blob/c6721a6/rholang/src/main/scala/coop/rchain/rholang/interpreter/util/RevAddress.scala#L13
const prefix = { coinId : "000000", version: "00" }

const bytesFromHex = hexStr => {
  const byte2hex = ([arr, bhi], x) =>
    bhi ? [[...arr, parseInt(`${bhi}${x}`, 16)]] : [arr, x]
  const [resArr] = Array.from(hexStr).reduce(byte2hex, [[]])
  return Uint8Array.from(resArr)
}

const toBase58 = hexStr => {
  const bytes = bytesFromHex(hexStr)
  return base58.encode(bytes)
}

export const getAddrFromEth = ethAddr => {
  if (!ethAddr || ethAddr.length !== 40) return

  // Hash ETH address
  const ethAddrBytes = bytesFromHex(ethAddr)
  const ethHash = keccak256(ethAddrBytes)

  // Add prefix with hash and calculate checksum (blake2b-256 hash)
  const payload = `${prefix.coinId}${prefix.version}${ethHash}`
  const payloadBytes = bytesFromHex(payload)
  const checksum = blake.blake2bHex(payloadBytes, void 666, 32).slice(0, 8)

  // Return REV address
  return toBase58(`${payload}${checksum}`)
}

export const getAddrFromPublicKey = publicKey => {
  if (!publicKey || publicKey.length !== 130) return

  // Public key bytes from hex string
  const pubKeyBytes = bytesFromHex(publicKey)
  // Remove one byte from pk bytes and hash
  const pkHash = keccak256(pubKeyBytes.slice(1))
  // Take last 40 chars from hashed pk (ETH address)
  const pkHash40 = pkHash.slice(-40)

  // Return both REV and ETH address
  return {
    revAddr: getAddrFromEth(pkHash40),
    ethAddr: pkHash40,
  }
}
