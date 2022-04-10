import { ec } from 'elliptic'
import * as ethUtil from 'ethereumjs-util'

import { decodeAscii } from '../lib.js'
import { deployDataProtobufSerialize } from '../rnode-sign.js'

export const recoverPublicKeyEth = (data, sigHex) => {
  // Ethereum lib to recover public key from massage and signature
  const hashed    = ethUtil.hashPersonalMessage(ethUtil.toBuffer([...data]))
  const sigBytes  = ethUtil.toBuffer(sigHex)
  const {v, r, s} = ethUtil.fromRpcSig(sigBytes)
  // Public key without prefix
  const pubkeyRecover = ethUtil.ecrecover(hashed, v, r, s)

  return ethUtil.bufferToHex([4, ...pubkeyRecover])
}

export const verifyDeployEth = deploySigned => {
  const {
    term, timestamp, phloPrice, phloLimit, validAfterBlockNumber, shardId,
    deployer, sig, // : Array[Byte]
  } = deploySigned

  // Serialize deploy data for signing
  const deploySerialized = deployDataProtobufSerialize({
    term, timestamp, phloPrice, phloLimit, validAfterBlockNumber, shardId,
  })

  // Create a hash of message with prefix
  // https://github.com/ethereumjs/ethereumjs-util/blob/4a8001c/src/signature.ts#L136
  const deployLen = deploySerialized.length
  const msgPrefix = `\x19Ethereum Signed Message:\n${deployLen}`
  const prefixBin = decodeAscii(msgPrefix)
  const msg       = ethUtil.toBuffer([...prefixBin, ...deploySerialized])
  const hashed    = ethUtil.keccak256(msg)

  // Check deployer's signature
  const crypt   = new ec('secp256k1')
  const key     = crypt.keyFromPublic(deployer)
  const sigRS   = { r: sig.slice(0, 32), s: sig.slice(32, 64) }
  const isValid = key.verify(hashed, sigRS)

  return isValid
}
