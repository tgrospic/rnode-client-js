// @ts-check
import * as R from 'ramda'
import m from 'mithril'
import { localNet, testNet, mainNet, getNodeUrls } from '../../rchain-networks'
import { ethDetected } from '../../eth/eth-wrapper'
import { makeRenderer } from './common'

// Controls
import { selectorCtrl } from './selector-ctrl'
import { addressCtrl } from './address-ctrl'
import { balanceCtrl } from './balance-ctrl'
import { transferCtrl } from './transfer-ctrl'
import { customDeployCtrl } from './custom-deploy-ctrl'
import { newRevAddress } from '@tgrospic/rnode-grpc-js'

/*
  This will display the test page to select local, testnet, and mainnet validators
  and make REV transfers and check balance.
*/

const repoUrl = 'https://github.com/tgrospic/rnode-client-js'

const mainCtrl = (st, effects) => {
  const { appCheckBalance, appTransfer, appSendDeploy, appPropose, log, warn } = effects

  const onCheckBalance = node => revAddr => appCheckBalance({node, revAddr})

  const onTransfer = (node, setStatus) => ({fromAccount, toAccount, amount}) =>
    appTransfer({node, fromAccount, toAccount, amount, setStatus})

  const onSendDeploy = (node, setStatus) => ({code, account, phloLimit}) =>
    appSendDeploy({node, code, account, phloLimit, setStatus})

  const onPropose = node => () => appPropose(node)

  const appendUpdateLens = pred => R.lens(R.find(pred), (x, xs) => {
    const idx = R.findIndex(pred, xs)
    // @ts-ignore - `R.update` types doesn't have defined curried variant
    const apply = idx === -1 ? R.append : R.update(idx)
    // @ts-ignore
    return apply(x, xs)
  })

  const onSaveAccount = account =>
    st.o('wallet')
      .o(appendUpdateLens(R.propEq('revAddr', account.revAddr)))
      .set(account)

  // State lenses for each control
  const selSt          = st.o('sel')
  const addressSt      = st.o('address')
  const balanceSt      = st.o('balance')
  const transferSt     = st.o('transfer')
  const customDeploySt = st.o('customDeploy')

  const {nets, netsDev, netsTestMain, sel, wallet, devMode} = st.view()
  const valNodeUrls  = getNodeUrls(sel.valNode)
  const readNodeUrls = getNodeUrls(sel.readNode)

  const setTransferStatus = transferSt.o('status').set
  const setDeployStatus   = customDeploySt.o('status').set

  const onDevMode = ({enabled}) => {
    // Show local network in dev mode
    const nets = enabled ? netsDev : netsTestMain
    const net  = nets[0]
    const sel  = {valNode: net.hosts[0], readNode: net.readOnlys[0]}
    st.update(s => ({...s, nets, sel, devMode: enabled}))
  }

  // TEMP: Hard Fork 1 info
  const startMs = new Date('2021-07-18 15:00').getTime()
  const endMs   = new Date('2021-07-25 01:00').getTime()
  const nowMs   = Date.now()
  const leftMs  = endMs - nowMs
  const hfMsgOn = leftMs > 0
  // Make smaller with time
  const pos  = leftMs / (endMs - startMs)
  const zoom = (1 - .5) * pos + .5
  // TEMP: Hard Fork 1 info

  // App render
  return m(`.${sel.valNode.name}`,
    m('.ctrl',
      'Demo client for RNode ',
      m('a', {href: repoUrl, target: '_blank'}, repoUrl),
      m('h1', 'RNode client testing page'),
    ),

    hfMsgOn && m('.hf-info', { style: `zoom: ${zoom}` },
      m.trust('<b>Main net</b> is back online after the <b>Hard Fork 1</b>. '),
      m.trust('See <a target="_blank" href="https://github.com/rchain/rchip-proposals/issues/42">RCHIP#42</a> for more info.'),
    ),

    // Selector control
    m('hr'),
    selectorCtrl(selSt, {nets, onDevMode}),

    // REV wallet control
    addressCtrl(addressSt, {wallet, node: valNodeUrls, onAddAccount: onSaveAccount}),

    // Check balance control
    balanceCtrl(balanceSt, {wallet, node: valNodeUrls, onCheckBalance: onCheckBalance(readNodeUrls)}),
    m('hr'),

    // Transfer REV control
    transferCtrl(transferSt, {
      wallet, node: valNodeUrls, onTransfer: onTransfer(valNodeUrls, setTransferStatus), warn,
    }),

    // Custom deploy control
    m('hr'),
    customDeployCtrl(customDeploySt, {
      wallet, node: valNodeUrls,
      onSendDeploy: onSendDeploy(valNodeUrls, setDeployStatus),
      onPropose: onPropose(valNodeUrls),
      warn,
    }),
  )
}

// Initialize all networks for display in UI
const prepareNets = nets =>
  nets.map(({title, name, tokenName, tokenDecimal: tokenDecimal, hosts, readOnlys}) => ({
    title, name, tokenName,
    hosts: hosts.map(x => ({...x, title, name, tokenName, tokenDecimal})),
    readOnlys: readOnlys.map(x => ({...x, title, name})),
  }))

const devMode      = false
const netsDev      = prepareNets([localNet])
const netsTestMain = prepareNets([testNet, mainNet])
const nets         = devMode ? netsDev : netsTestMain
const initNet      = nets[0]

// Initial application state
const initialState = {
  // All networks
  netsDev,
  netsTestMain,
  // Validators to choose
  nets,
  // Selected validator
  sel: { valNode: initNet.hosts[0], readNode: initNet.readOnlys[0] },
  // Initial wallet
  wallet: [], // [{name: 'My REV account', ...newRevAddress()}],
  // Dev mode  (show local networks)
  devMode,
}

export const startApp = (element, effects) => {
  const { warn } = effects

  // App renderer / creates state cell that is passed to controls
  const r = makeRenderer(element, mainCtrl)

  // Start app / the big bang!
  r(initialState, effects)

  warn('ETH detected', ethDetected)
}
