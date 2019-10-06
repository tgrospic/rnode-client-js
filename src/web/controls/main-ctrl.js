// Reference to TypeScript definitions for IntelliSense in VSCode
/// <reference path="../../../rnode-grpc-gen/js/rnode-grpc-js.d.ts" />
import grpcWeb from 'grpc-web'
import { ec } from 'elliptic'
import m from 'mithril'
import { rnodeDeploy, rnodePropose, signDeploy } from '@tgrospic/rnode-grpc-js'

// Generated files with rnode-grpc-js tool
import protoSchema from '../../../rnode-grpc-gen/js/pbjs_generated.json'

// Controls
import { selectorCtrl } from './selector-ctrl'
import { addressCtrl } from './address-ctrl'
import { balanceCtrl } from './balance-ctrl'
import { transferCtrl } from './transfer-ctrl'

/*
  Additional stuff (for now) only in the browser example.

  This will display the test page to select testnet and local validators
  and make sample requests.
*/

const { log, warn } = console

// Available networks and validators
const proxyNets = [
  // node{0-9}.testnet.rchain-dev.tk
  // https://testnet-{0-9}.grpc.rchain.isotypic.com
  ['testnet', 10],
  // ['devnet', 5],
  // ['sandboxnet', 5],
]

const localProxyNet = { label: 'local', urls: [
  {grpc: 'localhost:40401', http: 'http://localhost:44401'},
  {grpc: 'localhost:50401', http: 'http://localhost:54401'},
]}

const getUrls = net => n => ({
  grpc: `node${n}.${net}.rchain-dev.tk:40401`,
  http: `https://${net}-${n}.grpc.rchain.isotypic.com`,
})

const repoUrl = 'https://github.com/tgrospic/rnode-client-js'

const rnode = rnodeUrl => {
  // Instantiate http clients
  const options = { grpcLib: grpcWeb, host: rnodeUrl, protoSchema }

  // Get RNode service methods
  const { DoDeploy, listenForDataAtName } = rnodeDeploy(options)
  const { propose } = rnodePropose(options)
  return { DoDeploy, propose, listenForDataAtName }
}

const sendDeploy = async (rnodeUrl, code, privateKey) => {
  const { DoDeploy, propose } = rnode(rnodeUrl)
  // Deploy signing key
  const secp256k1 = new ec('secp256k1')
  const key = privateKey || secp256k1.genKeyPair()
  // Create deploy
  const deployData = { term: code, phlolimit: 100e3 }
  // Sign deploy
  const deploy = signDeploy(key, deployData)
  // Send deploy
  const { message } = await DoDeploy(deploy)
  // Try to propose but don't throw on error
  try {
    const resPropose = await propose()
    warn('PROPOSE', resPropose)
  } catch (error) { warn(error) }
  // Deploy response
  return [message, deploy]
}

const getDataForDeploy = async (rnodeUrl, deployId) => {
  const { listenForDataAtName } = rnode(rnodeUrl)
  const { blockresultsList } = await listenForDataAtName({
    depth: -1,
    name: { unforgeablesList: [{gDeployIdBody: {sig: deployId}}] },
  })
  // Get data as number
  return blockresultsList.length &&
    blockresultsList[0].postblockdataList[0].exprsList[0].gInt
}

const bytesFromHex = hexStr => {
  const byte2hex = ([arr, bhi], x) =>
    bhi ? [[...arr, parseInt(`${bhi}${x}`, 16)]] : [arr, x]
  const [resArr] = Array.from(hexStr).reduce(byte2hex, [[]])
  return Uint8Array.from(resArr)
}

const mainCtrl = (r, st) => {
  const {rnodeExample, nets, sel, address, balance, transfer} = st

  // State setters (renderers)
  const selSet      = sel      => r({...st, sel})
  const addrSet     = address  => r({...st, address})
  const balanceSet  = balance  => r({...st, balance})
  const transferSet = transfer => r({...st, transfer})

  const onCheckBalance = async code => {
    log('SEND CHECK BALANCE', code)
    const [response, {sig}] = await sendDeploy(sel.http, code)
    log('SENT', response)
    const data = await getDataForDeploy(sel.http, sig)
    balanceSet({...balance, dataBal: data})
  }

  const onGetData = async deployIdHex => {
    const deployId = bytesFromHex(deployIdHex)
    const data = await getDataForDeploy(sel.http, deployId)
    balanceSet({...balance, dataGet: data})
  }

  const onTransfer = async (code, privateKey) => {
    log('SEND TRANSFER', code)
    const [response] = await sendDeploy(sel.http, code, privateKey)
    log('SENT', response)
  }

  // App render
  return m('div',
    m('div', 'Demo client for RNode ',
      m('a', {href: repoUrl, target: '_blank'}, repoUrl)),
    m('h1', 'RNode client testing page'),
    m('h2', 'RNode selector'),
    selectorCtrl(selSet, {nets, sel}),
    m('hr'),
    m('h2', 'REV address from public key or ETH address'),
    addressCtrl(addrSet, {...address}),
    m('hr'),
    m('h2', 'Check REV balance'),
    balanceCtrl(balanceSet, {...balance, onCheckBalance, onGetData}),
    m('hr'),
    m('h2', 'Transfer REV tokens'),
    transferCtrl(transferSet, {...transfer, onTransfer}),
    m('hr'),
    m('h2', 'Sample requests to RNode'),
    m('div', 'Check browser console to see the errors also.'),
    m('button', {onclick: _ => rnodeExample(sel.http)}, 'Execute'),
  )
}

const range = n => [...Array(n).keys()]

const getNetworkUrls = ([net, size]) => ({
  label: net,
  urls: range(size).map(getUrls(net)),
})

const netsGrouped = proxyNets.map(getNetworkUrls)

const initialState = {
  // Validators to choose
  nets: [localProxyNet, ...netsGrouped],
  // Selected validator
  sel: netsGrouped[0].urls[0],
}

// Wraps Virtual DOM renderer to render state
const makeRenderer = (element, view) => state => {
  const render = st => m.render(element, view(render, st))
  render(state)
}

export const startApp = rnodeExample => {
  // App renderer / this `r` works similar as `r` arg in controls
  const r = makeRenderer(document.querySelector('#app'), mainCtrl)

  // Start app / the big bang!
  r({...initialState, rnodeExample})
}
