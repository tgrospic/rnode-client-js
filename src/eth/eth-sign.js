import { ec } from 'elliptic'
import * as ethUtil from 'ethereumjs-util'
import { rnodeProtobuf } from '@tgrospic/rnode-grpc-js'

// Generated files with rnode-grpc-js tool
import protoSchema from '../../rnode-grpc-gen/js/pbjs_generated.json'
// Import generated protobuf types (in global scope)
// - because of imports in index.js these are not needed here
// import '../../rnode-grpc-gen/js/DeployServiceV1_pb'
// import '../../rnode-grpc-gen/js/ProposeServiceV1_pb'

import { decodeAscii } from '../lib.js'

export const recoverPublicKeyEth = (data, sigHex) => {
  // Ethereum lib
  const hashed    = ethUtil.hashPersonalMessage(ethUtil.toBuffer([...data]))
  const sigBytes  = ethUtil.toBuffer(sigHex)
  const {v, r, s} = ethUtil.fromRpcSig(sigBytes)
  // Public key without prefix
  const pubkeyRecover = ethUtil.ecrecover(hashed, v, r, s)

  // const pubkeyHex2 = Buffer.from([4, ...pubkeyRecover]).toString('hex')
  return ethUtil.bufferToHex([4, ...pubkeyRecover])
}

const { DeployDataProto } = rnodeProtobuf({protoSchema})

export const verifyDeployEth = deploySigned => {
  const {
    term, timestamp, phloprice, phlolimit,
    validafterblocknumber,
    deployer, sig, // : Array[Byte]
  } = deploySigned

  // Serialize deploy data for signing
  const deploySerialized = DeployDataProto.serialize({
    term, timestamp, phloprice, phlolimit, validafterblocknumber
  })

  // Create a hash of message with prefix
  // https://github.com/ethereumjs/ethereumjs-util/blob/4a8001c/src/signature.ts#L136
  const deployLen = deploySerialized.length
  const msgPrefix = `\x19Ethereum Signed Message:\n${deployLen}`
  const prefixBin = decodeAscii(msgPrefix)
  const msg       = [...prefixBin, ...deploySerialized]
  const hashed    = ethUtil.keccak256(msg)

  // Check deployer's signature
  const crypt   = new ec('secp256k1')
  const key     = crypt.keyFromPublic(deployer)
  const sigRS   = { r: sig.slice(0, 32), s: sig.slice(32, 64) }
  const isValid = key.verify(hashed, sigRS)

  return isValid
}
