// @ts-check
import * as R from 'ramda'
import { ec } from 'elliptic'

import { encodeBase16, decodeBase16 } from './lib.js'
import { verifyDeployEth, recoverPublicKeyEth } from './eth/eth-sign.js'
import { ethDetected, ethereumAddress, ethereumSign } from './eth/eth-wrapper.js'
import { signDeploy, verifyDeploy, deployDataProtobufSerialize } from './rnode-sign'

export const makeRNodeWeb = effects => {
  // Dependency DOM fetch function
  const { fetch } = effects

  // Basic wrapper around DOM `fetch` method
  const rnodeHttp = makeRNodeHttpInternal(fetch)

  // RNode HTTP API methods
  return {
    rnodeHttp,
    sendDeploy      : sendDeploy(rnodeHttp),
    getDataForDeploy: getDataForDeploy(rnodeHttp),
    propose         : propose(rnodeHttp),
  }
}

// Helper function to create JSON request to RNode Web API
const makeRNodeHttpInternal = domFetch => async (httpUrl, apiMethod, data) => {
  // Prepare fetch options
  const postMethods = ['prepare-deploy', 'deploy', 'data-at-name', 'explore-deploy', 'propose']
  const isPost      = !!data && R.includes(apiMethod, postMethods)
  const httpMethod  = isPost ? 'POST' : 'GET'
  const url         = method => `${httpUrl}/api/${method}`
  const body        = typeof data === 'string' ? data : JSON.stringify(data)
  // Make JSON request
  const opt    = { method: httpMethod, body }
  const resp   = await domFetch(url(apiMethod), opt)
  const result = await resp.json()
  // Add status if server error
  if (!resp.ok) {
    const ex = Error(result);
    // @ts-ignore
    ex.status = resp.status
    throw ex
  }

  return result
}

// Creates deploy, signing and sending to RNode
const sendDeploy = rnodeHttp => async (node, account, code, phloLimit) => {
  // Check if deploy can be signed
  if (!account.privKey) {
    const ethAddr = account.ethAddr
    if (ethDetected && !!ethAddr) {
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
  const phloLimitNum = !!phloLimit || phloLimit == 0 ? phloLimit : 500e3
  const deployData = {
    term: code,
    phloLimit: phloLimitNum, phloPrice: 1,
    validAfterBlockNumber: blockNumber,
    timestamp: Date.now(),
    shardId: node.shardId,
  }

  const deploy = !!account.privKey
    ? signPrivKey(deployData, account.privKey)
    : await signMetamask(deployData)

  // Send deploy / result is deploy signature (ID)
  await rnodeHttp(node.httpUrl, 'deploy', deploy)

  return deploy
}

// Singleton timeout handle to ensure only one execution
let GET_DATA_TIMEOUT_HANDLE

// Listen for data on `deploy signature`
const getDataForDeploy = rnodeHttp => async ({httpUrl}, deployId, onProgress) => {
  GET_DATA_TIMEOUT_HANDLE && clearTimeout(GET_DATA_TIMEOUT_HANDLE)

  const getData = (resolve, reject) => async () => {
    const getDataUnsafe = async () => {
      // Fetch deploy by signature (deployId)
      const deploy = await fetchDeploy(rnodeHttp)({httpUrl}, deployId)
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
        // Return data with cost (assumes data in one block)
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

const fetchDeploy = rnodeHttp => async ({httpUrl}, deployId) => {
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

// Helper function to propose via HTTP
const propose = rnodeHttp => ({httpAdminUrl}) => rnodeHttp(httpAdminUrl, 'propose', {})

// Creates deploy signature with Metamask
const signMetamask = async deployData => {
  // Serialize and sign with Metamask extension
  // - this will open a popup for user to confirm/review
  const data    = deployDataProtobufSerialize(deployData)
  const ethAddr = await ethereumAddress()
  const sigHex  = await ethereumSign(data, ethAddr)
  // Extract public key from signed message and signature
  const pubKeyHex = recoverPublicKeyEth(data, sigHex)
  // Create deploy object for signature verification
  const deploy = {
    ...deployData,
    sig: decodeBase16(sigHex),
    deployer: decodeBase16(pubKeyHex),
    sigAlgorithm: 'secp256k1:eth',
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
const toWebDeploy = deployData => {
  const {
    term, timestamp, phloPrice, phloLimit, validAfterBlockNumber, shardId,
    deployer, sig, sigAlgorithm,
  } = deployData

  const result = {
    data: { term, timestamp, phloPrice, phloLimit, validAfterBlockNumber, shardId },
    sigAlgorithm,
    signature: encodeBase16(sig),
    deployer: encodeBase16(deployer),
  }
  return result
}
