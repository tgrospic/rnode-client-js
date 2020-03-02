// Reference to TypeScript definitions for IntelliSense in VSCode
/// <reference path="../rnode-grpc-gen/js/rnode-grpc-js.d.ts" />
import * as R from 'ramda'
import grpcWeb from 'grpc-web'
import { ec } from 'elliptic'

import { signDeploy, verifyDeploy, rnodeProtobuf, rnodePropose } from '@tgrospic/rnode-grpc-js'

// Generated files with rnode-grpc-js tool
import protoSchema from '../rnode-grpc-gen/js/pbjs_generated.json'
// Import generated protobuf types (in global scope)
// - because of imports in index.js these are not needed here
// import '../rnode-grpc-gen/js/DeployServiceV1_pb'
// import '../rnode-grpc-gen/js/ProposeServiceV1_pb'

import { encodeBase16, decodeBase16 } from './lib.js'
import { verifyDeployEth, recoverPublicKeyEth } from './eth/eth-sign.js'
import { ethDetected, ethereumAddress, ethereumSign } from './eth/eth-wrapper.js'

const { log, warn } = console

// Helper function to create JSON request to RNode Web API
export const rnodeHttp = async (httpUrl, apiMethod, data) => {
  // Prepare fetch options
  const postMethods = ['prepare-deploy', 'deploy', 'data-at-name', 'explore-deploy']
  const isPost      = !!data && R.includes(apiMethod, postMethods)
  const httpMethod  = isPost ? 'POST' : 'GET'
  const url         = method => `${httpUrl}/api/${method}`
  const body        = typeof data === 'string' ? data : JSON.stringify(data)
  // Make JSON request
  const opt    = { method: httpMethod, body }
  const resp   = await fetch(url(apiMethod), opt)
  const result = await resp.json()
  if (!resp.ok) throw Error(result)

  return result
}

// Creates deploy signature with Metamask
const signMetamask = async deployData => {
  // Get protobuf serialized for DeployDataProto object
  const { DeployDataProto } = rnodeProtobuf({protoSchema})
  // Serialize and sign with Metamask extension
  // - this will open a popup for user to confirm/review
  const data    = DeployDataProto.serialize(deployData)
  const ethAddr = await ethereumAddress()
  const sigHex  = await ethereumSign(data, ethAddr)
  // Extract public key from signed message and signature
  const pubKeyHex = recoverPublicKeyEth(data, sigHex)
  // Create deploy object for signature verification
  const deploy = {
    ...deployData,
    sig: decodeBase16(sigHex),
    deployer: decodeBase16(pubKeyHex),
    sigalgorithm: 'secp256k1:eth'
  }
  // Verify signature signed with Metamask
  const isValidDeploy = verifyDeployEth(deploy)
  if (!isValidDeploy) throw Error('Metamask signature verification failed.')

  return toWebDeploy(deploy)
}

// Creates deploy signature with plain private key
const signPrivKey = (deployData, privateKey)  => {
  // Create signing key
  const secp256k1 = new ec('secp256k1')
  const key       = secp256k1.keyFromPrivate(privateKey)
  const deploy    = signDeploy(key, deployData)
  // Verify deploy signature
  const isValidDeploy = verifyDeploy(deploy)
  if (!isValidDeploy) throw Error('Deploy signature verification failed.')

  return toWebDeploy(deploy)
}

// Converts JS object from protobuf spec. to Web API spec.
const toWebDeploy = deployData => ({
  data: {
    term: deployData.term,
    timestamp: deployData.timestamp,
    phloPrice: deployData.phloprice,
    phloLimit: deployData.phlolimit,
    validAfterBlockNumber: deployData.validafterblocknumber,
  },
  sigAlgorithm: deployData.sigalgorithm,
  signature: encodeBase16(deployData.sig),
  deployer: encodeBase16(deployData.deployer),
})

// Creates deploy, signing and sending to RNode
export const sendDeploy = async (node, account, code) => {
  // Check if deploy can be signed
  if (!account.privKey) {
    if (ethDetected) {
      // If Metamask is detected check ETH address
      const ethAddr = await ethereumAddress()
      if (ethAddr.replace(/^0x/, '') !== account.ethAddr)
        throw Error('Selected account is not the same as Metamask account.')
    } else {
      throw Error(`Selected account doesn't have private key and cannot be used for signing.`)
    }
  }

  // Get the latest block number
  const [{ blockNumber }] = await rnodeHttp(node.httpUrl, 'blocks/1')

  // Create a deploy
  const deployData = {
    term: code,
    phlolimit: 250e3, phloprice: 1,
    validafterblocknumber: blockNumber,
    timestamp: Date.now(),
  }

  const deploy = !!account.privKey
    ? signPrivKey(deployData, account.privKey)
    : await signMetamask(deployData)

  // Send deploy
  await rnodeHttp(node.httpUrl, 'deploy', deploy)

  // Don't wait on propose to finish
  proposeLocal(node).catch(ex => warn('Propose failed', ex))

  return deploy
}

// Singleton timeout handle to ensure only one execution
let GET_DATA_TIMEOUT_HANDLE

// Listen for data on `deploy signature`
export const getDataForDeploy = async ({httpUrl}, deployId, onProgress) => {
  GET_DATA_TIMEOUT_HANDLE && clearTimeout(GET_DATA_TIMEOUT_HANDLE)

  // Get validator's latest sequence number
  const getSeqNumber = async () => {
    const { seqNumber } = await rnodeHttp(httpUrl, 'prepare-deploy')
    return seqNumber
  }

  // Remember current sequence number to recognize when new block is created
  // - validator must increase this number for each block
  const startSeqNumber = await getSeqNumber()

  const getData = (resolve, reject) => async () => {
    const getDataUnsafe = async () => {
      const args = { depth: 2, name: { UnforgDeploy: { data: deployId } } }
      // Request for data at deploy signature (deployId)
      const { exprs } = await rnodeHttp(httpUrl, 'data-at-name', args)
      // Check if RNode returned any data
      const hasData = !R.isEmpty(exprs) && !exprs[0].ExprTuple
      if (hasData) {
        // Data received
        resolve(exprs[0])
      } else {
        // No data from RNode, check if block is created via sequence number
        const seqNumber = await getSeqNumber()
        const delta = seqNumber - startSeqNumber
        if (delta > 0) {
          // Block is created, let's find our deploy (it should be in the new block)
          const block = await rnodeHttp(httpUrl, `deploy/${deployId}`)
          if (!block) {
            throw Error(`New block was created but the download failed.`)
          } else {
            const {deploys} = await rnodeHttp(httpUrl, `block/${block.blockHash}`)
            const deploy    = deploys.find(({sig}) => sig === deployId)
            console.warn({deploy})
            if (!deploy) {
              throw Error(`Deploy is not found in the new block (${block.blockHash}).`)
            } else {
              const {errored, systemDeployError} = deploy
              if (!errored && !systemDeployError) {
                throw Error(`Result data not found, deploy has no errors and can be successful.`)
              } else if (errored) {
                throw Error(`Deploy error when executing Rholang code.`)
              } else if (!!systemDeployError) {
                throw Error(`${systemDeployError} (system error).`)
              } else {
                throw Error(`Unknown error occurred in block (${block.blockHash}).`)
              }
            }
          }
        } else {
          // Retry
          const cancel = await onProgress(exprs)
          if (!cancel) {
            GET_DATA_TIMEOUT_HANDLE && clearTimeout(GET_DATA_TIMEOUT_HANDLE)
            GET_DATA_TIMEOUT_HANDLE = setTimeout(getData(resolve, reject), 7500)
          }
        }
      }
    }
    try { await getDataUnsafe() }
    catch (ex) { reject(ex) }
  }
  return await new Promise((resolve, reject) => {
    getData(resolve, reject)()
  })
}

// Helper function to propose via gRPC/HTTP proxy
export const proposeLocal = async node => {
  // Propose block if local network
  if (node.network === 'localnet') {
    // Instantiate http clients
    const options = { grpcLib: grpcWeb, host: node.grpcProxyUrl, protoSchema }
    const { propose } = rnodePropose(options)
    await propose()
  }
}
