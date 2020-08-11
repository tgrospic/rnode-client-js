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
  // Add status if server error
  if (!resp.ok) {
    const ex = Error(result)
    ex.status = resp.status
    throw ex
  }

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
    //phlolimit: 250e3, phloprice: 1,
    phlolimit: 6000000, phloprice: 1, // TEMP
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

  const getData = (resolve, reject) => async () => {
    const getDataUnsafe = async () => {
      // Fetch deploy by signature (deployId)
      const deploy = await fetchDeploy({httpUrl}, deployId)
      if (deploy) {
        // Deploy found (added to a block)
        const args = { depth: 1, name: { UnforgDeploy: { data: deployId } } }
        // Request for data at deploy signature (deployId)
        const { exprs } = await rnodeHttp(httpUrl, 'data-at-name', args)
        // Extract cost from deploy info
        const { cost } = deploy
        // Check deploy errors
        const {errored, systemDeployError} = deploy
        if (errored) {
          throw Error(`Deploy error when executing Rholang code.`)
        } else if (!!systemDeployError) {
          throw Error(`${systemDeployError} (system error).`)
        }
        // Return data with cost (assumes only one produce on the return channel)
        resolve({data: exprs[0], cost})
      } else {
        // Retry
        const cancel = await onProgress()
        if (!cancel) {
          GET_DATA_TIMEOUT_HANDLE && clearTimeout(GET_DATA_TIMEOUT_HANDLE)
          GET_DATA_TIMEOUT_HANDLE = setTimeout(getData(resolve, reject), 7500)
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

const fetchDeploy = async ({httpUrl}, deployId) => {
  // Request a block with the deploy
  const block = await rnodeHttp(httpUrl, `deploy/${deployId}`)
    .catch(ex => {
      // Handle response code 400 / deploy not found
      if (ex.status !== 400) throw ex
    })
  if (block) {
    const {deploys} = await rnodeHttp(httpUrl, `block/${block.blockHash}`)
    const deploy    = deploys.find(({sig}) => sig === deployId)
    if (!deploy) // This should not be possible if block is returned
      throw Error(`Deploy is not found in the block (${block.blockHash}).`)
    // Return deploy
    return deploy
  }
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
