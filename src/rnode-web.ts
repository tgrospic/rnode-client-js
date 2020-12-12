import * as R from 'ramda'
import { ec } from 'elliptic'

import { encodeBase16, decodeBase16 } from './lib'
import { verifyDeployEth, recoverPublicKeyEth } from './eth/eth-sign'
import { ethDetected, ethereumAddress, ethereumSign } from './eth/eth-wrapper'
import { signDeploy, verifyDeploy, deployDataProtobufSerialize, DeployData, DeploySignedProto } from './rnode-sign'
import { RevAccount } from './rev-address'

export type RNodeHttp = (httpUrl: string, apiMethod: string, data?: any) => Promise<any>

// export interface RNodeWebAPI extends SendDeployEff, GetDeployDataEff, ProposeEff, RawRNodeHttpEff {}

export type RNodeWebAPI = SendDeployEff & GetDeployDataEff & ProposeEff & RawRNodeHttpEff

export interface RawRNodeHttpEff {
  /**
   * Raw RNode HTTP interface.
   */
  rnodeHttp: RNodeHttp
}

export interface SendDeployEff {
  /**
   * Send deploy to RNode.
   */
  sendDeploy: (node: { httpUrl: string }, account: RevAccount, code: string, phloLimit?: number)
    => Promise<Deploy>
}

export interface GetDeployDataEff {
  /**
   * Get data from deploy (`rho:rchain:deployId`).
   */
  getDataForDeploy: (node: RNodeHttpUrl, deployId: string, onProgress: () => boolean)
    => Promise<{data: any, cost: number}>
}

export interface ProposeEff {
  /**
   * Tell the node to propose a block (admin/internal API only).
   */
  propose: (node: RNodeHttpAdminUrl) => Promise<string>
}

/**
 * Deploy object with signature
 */
export interface Deploy {
  data: DeployData
  sigAlgorithm: string
  deployer: string
  signature: string
}

/**
 * Deploy info from block
 */
export interface DeployResult {
  // Deploy ID (signature)
  sig: string
  // Cost in REV (base units)
  cost: number
  // Flag if deploy has error in execution
  errored: boolean
  // Error message if charging for deploy failed
  systemDeployError: string
  // Deployer public key
  deployer: string
  sigAlgorithm: string
  term: string
  timestamp: number
  phloPrice: number
  phloLimit: number
  validAfterBlockNumber: number
}

/**
 * Effect: value for new timestamp for deploy
 */
export type now = () => number

export interface DOMEffects {
  fetch: typeof fetch
  now: now
}

/**
 * Create instance of RNode Web client.
 */
export function makeRNodeWeb (effects: DOMEffects): RNodeWebAPI {
  // Dependency DOM fetch function
  const { fetch, now } = effects

  // Basic wrapper around DOM `fetch` method
  const rnodeHttp = makeRNodeHttpInternal(fetch)

  // RNode HTTP API methods
  return {
    rnodeHttp,
    sendDeploy      : sendDeploy(rnodeHttp, now),
    getDataForDeploy: getDataForDeploy(rnodeHttp),
    propose         : propose(rnodeHttp),
  }
}

export type MakeRNode = (f: typeof fetch) => RNodeHttp

/**
 * Helper function to create RNode wrapper to Web API.
 */
const makeRNodeHttpInternal: MakeRNode = domFetch => async (httpUrl, apiMethod, data) => {
  // Prepare fetch options
  const postMethods = ['prepare-deploy', 'deploy', 'data-at-name', 'explore-deploy', 'propose']
  const isPost      = !!data && R.includes(apiMethod, postMethods)
  const httpMethod  = isPost ? 'POST' : 'GET'
  const url         = (method: string) => `${httpUrl}/api/${method}`
  const body        = typeof data === 'string' ? data : JSON.stringify(data)
  // Make JSON request
  const opt    = { method: httpMethod, body }
  const resp   = await domFetch(url(apiMethod), opt)
  const result = await resp.json()
  // Add status if server error
  if (!resp.ok) {
    const ex = Error(result)
    // @ts-ignore
    ex.status = resp.status
    throw ex
  }

  return result
}

type SendDeployMethod =
  (r: RNodeHttp, n: now) =>
  ( node: {httpUrl: string}
  , account: RevAccount
  , code: string
  , phloLimit?: number
  ) => Promise<Deploy>

/**
 * Creates deploy, signing and sending to RNode.
 */
const sendDeploy: SendDeployMethod = (rnodeHttp, now) => async ({httpUrl}, account, code, phloLimit) => {
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
  const [{ blockNumber }] = await rnodeHttp(httpUrl, 'blocks/1')

  // Create a deploy
  const phloLimitNum = !!phloLimit || phloLimit == 0 ? phloLimit : 250e3
  const deployData: DeployData = {
    term: code,
    phloLimit: phloLimitNum, phloPrice: 1,
    validAfterBlockNumber: blockNumber,
    timestamp: now(),
  }

  const deploy = !!account.privKey
    ? signPrivKey(deployData, account.privKey)
    : await signMetamask(deployData)

  // Send deploy / result is deploy signature (ID)
  await rnodeHttp(httpUrl, 'deploy', deploy)

  return deploy
}

// Singleton timeout handle to ensure only one execution
let GET_DATA_TIMEOUT_HANDLE: NodeJS.Timeout

type DataForDeployMethod =
  (r: RNodeHttp) =>
  (node: RNodeHttpUrl, deployId: string, onProgress: () => boolean)
  => Promise<{data: any, cost: number}>

/**
 * Listen for data on `deploy signature` (`rho:rchain:deployId`).
 */
const getDataForDeploy: DataForDeployMethod = rnodeHttp => async ({httpUrl}, deployId, onProgress) => {
  GET_DATA_TIMEOUT_HANDLE && clearTimeout(GET_DATA_TIMEOUT_HANDLE)

  const getData = (resolve: (d: any) => void, reject: (ex: Error) => void) => async () => {
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

type RNodeHttpUrl = {httpUrl: string}

type FetchDeployMethod =
  (r: RNodeHttp) => (node: RNodeHttpUrl, deployId: string)
  => Promise<DeployResult>

/**
 * Get deploy result from the block where is proposed (throws error if not found).
 */
const fetchDeploy: FetchDeployMethod = rnodeHttp => async ({httpUrl}, deployId) => {
  // Request a block with the deploy
  const block = await rnodeHttp(httpUrl, `deploy/${deployId}`)
    .catch(ex => {
      // Handle response code 400 / deploy not found
      if (ex.status !== 400) throw ex
    })
  if (block) {
    const {deploys} = await rnodeHttp(httpUrl, `block/${block.blockHash}`)
    const deploy    = deploys.find(({sig}: {sig: string}) => sig === deployId)
    if (!deploy) // This should not be possible if block is returned
      throw Error(`Deploy is not found in the block (${block.blockHash}).`)
    // Return deploy
    return deploy
  }
}

export type RNodeHttpAdminUrl = {httpAdminUrl: string}

type ProposeMethod = (r: RNodeHttp) => (node: RNodeHttpAdminUrl) => Promise<string>

/**
 * Helper function to propose via HTTP.
 */
const propose: ProposeMethod = (rnodeHttp) => ({httpAdminUrl}) =>
  rnodeHttp(httpAdminUrl, 'propose', {})

const propose2 = function (rnodeHttp: RNodeHttp) {
  return function ({httpAdminUrl}: RNodeHttpAdminUrl) {
    return rnodeHttp(httpAdminUrl, 'propose', {})
  }
}

/**
 * Creates deploy signature with Metamask.
 */
const signMetamask = async function (deployData: DeployData) {
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

/**
 * Creates deploy signature with plain private key.
 */
const signPrivKey = function (deployData: DeployData, privateKey: ec.KeyPair | string) {
  // Create signing key
  const secp256k1 = new ec('secp256k1')
  const key       = secp256k1.keyFromPrivate(privateKey)
  const deploy    = signDeploy(key, deployData)
  // Verify deploy signature
  const isValidDeploy = verifyDeploy(deploy)
  if (!isValidDeploy) throw Error('Deploy signature verification failed.')

  return toWebDeploy(deploy)
}

/**
 * Converts JS object from protobuf spec. to Web API spec.
 */
const toWebDeploy = function (deployData: DeploySignedProto): Deploy {
  const {
    term, timestamp, phloPrice, phloLimit, validAfterBlockNumber,
    deployer, sig, sigAlgorithm,
  } = deployData

  return {
    data: { term, timestamp, phloPrice, phloLimit, validAfterBlockNumber },
    sigAlgorithm,
    signature: encodeBase16(sig),
    deployer: encodeBase16(deployer),
  }
}
