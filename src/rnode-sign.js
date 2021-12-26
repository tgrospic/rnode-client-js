// @ts-check
import blake from 'blakejs'
import { ec } from 'elliptic'
import jspb from 'google-protobuf'

export const signDeploy = (privateKey, deployObj) => {
  const {
    term, timestamp, phloPrice, phloLimit, validAfterBlockNumber,
    sigAlgorithm = 'secp256k1',
  } = deployObj

  // Serialize deploy data for signing
  const deploySerialized = deployDataProtobufSerialize({
    term, timestamp, phloPrice, phloLimit, validAfterBlockNumber,
  })

  // Signing key
  const crypt    = new ec(sigAlgorithm)
  const key      = getSignKey(crypt, privateKey)
  const deployer = Uint8Array.from(key.getPublic('array'))
  // Hash and sign serialized deploy
  const hashed   = blake.blake2bHex(deploySerialized, void 666, 32)
  const sigArray = key.sign(hashed, {canonical: true}).toDER('array')
  const sig      = Uint8Array.from(sigArray)

  // Return deploy object / ready for sending to RNode
  return {
    term, timestamp, phloPrice, phloLimit, validAfterBlockNumber,
    deployer, sig, sigAlgorithm,
  }
}

export const verifyDeploy = deployObj => {
  const {
    term, timestamp, phloPrice, phloLimit, validAfterBlockNumber,
    deployer, sig, sigAlgorithm,
  } = deployObj

  // Serialize deploy data for signing
  const deploySerialized = deployDataProtobufSerialize({
    term, timestamp, phloPrice, phloLimit, validAfterBlockNumber,
  })

  // Signing public key to verify
  const crypt   = new ec(sigAlgorithm)
  const key     = crypt.keyFromPublic(deployer)
  // Hash and verify signature
  const hashed  = blake.blake2bHex(deploySerialized, void 666, 32)
  const isValid = key.verify(hashed, sig)

  return isValid
}

// Fix for ec.keyFromPrivate not accepting KeyPair
// - detect KeyPair if it have `sign` function
const getSignKey = (crypt, pk) =>
  pk && pk.sign && pk.sign.constructor == Function ? pk : crypt.keyFromPrivate(pk)

// Serialization of DeployDataProto object without generated JS code
export const deployDataProtobufSerialize = deployData => {
  const { term, timestamp, phloPrice, phloLimit, validAfterBlockNumber } = deployData

  // Create binary stream writer
  const writer = new jspb.BinaryWriter()
  // Write fields (protobuf doesn't serialize default values)
  const writeString = (order, val) => val != "" && writer.writeString(order, val)
  const writeInt64  = (order, val) => val != 0  && writer.writeInt64(order, val)

  // https://github.com/rchain/rchain/blob/f7e46a9/models/src/main/protobuf/CasperMessage.proto#L134-L143
  // message DeployDataProto {
  //   bytes  deployer     = 1; //public key
  //   string term         = 2; //rholang source code to deploy (will be parsed into `Par`)
  //   int64  timestamp    = 3; //millisecond timestamp
  //   bytes  sig          = 4; //signature of (hash(term) + timestamp) using private key
  //   string sigAlgorithm = 5; //name of the algorithm used to sign
  //   int64 phloPrice     = 7; //phlo price
  //   int64 phloLimit     = 8; //phlo limit for the deployment
  //   int64 validAfterBlockNumber = 10;
  // }

  // Serialize fields
  writeString(2, term)
  writeInt64(3, timestamp)
  writeInt64(7, phloPrice)
  writeInt64(8, phloLimit)
  writeInt64(10, validAfterBlockNumber)

  return writer.getResultBuffer()
}
