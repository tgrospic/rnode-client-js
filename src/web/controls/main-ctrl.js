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

import { makeRNodeWeb } from '../../rnode-web'

/*
  This will display the test page to select local, testnet, and mainnet validators
  and make REV transfers and check balance.
*/

const {rnodeHttp} = makeRNodeWeb({fetch})
const repoUrl = 'https://github.com/tgrospic/rnode-client-js'
const randomOffset = Math.floor(Math.random() * (2 - 1 + 1)) + 1 //Random number between 1 and 2, for load balancing

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
  const selSt               = st.o('sel')
  const addressSt           = st.o('address')
  const balanceSt            = st.o('balance')
  const transferSt           = st.o('transfer')
  const customDeploySt       = st.o('customDeploy')
  const autoSelectIntervalSt = st.o('autoSelectInterval')

  const {nets, netsDev, netsTestMain, sel, wallet, devMode, autoSelectDisabled} = st.view()
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

  const FetchNextValidator = async () => {
    const {autoSelectDisabled} = st.view()
    if (autoSelectDisabled) {
      //Disables transfer/deploy buttons once during toggle
      transferSt.update(s => ({...s, fetching: true}))
      customDeploySt.update(s => ({...s, fetching: true}))
    }
    const { nextToPropose } = await rnodeHttp("https://status.rchain.coop", 'validators')

    const net  = nets[1] //Select Mainnet
    
    const next = net.hosts.filter(obj => {
      return obj.domain === nextToPropose.host
    })[0];
    const nextId = net.hosts.indexOf(next);

    const sel  = {valNode: net.hosts[(nextId + randomOffset) % net.hosts.length], readNode: net.readOnlys[0]}

    st.update(s => ({...s, sel}))
    transferSt.update(s => ({...s, fetching: false}))
    customDeploySt.update(s => ({...s, fetching: false}))
  }

  const onAutoSelectToggle = ({disabled}) => {
    if (!disabled) {
      const interval = setInterval(FetchNextValidator, 5 * 1000)
      autoSelectIntervalSt.set({interval: interval})
      FetchNextValidator() //Trigger immediately
    } else {
      const {interval} = autoSelectIntervalSt.view({})
      clearInterval(interval)
    }

    st.update(s => ({...s, autoSelectDisabled: disabled}))
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
    selectorCtrl(selSt, {nets, onDevMode, onAutoSelectToggle}),

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
const autoSelectDisabled = true
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
  autoSelectDisabled: autoSelectDisabled
}

export const startApp = (element, effects) => {
  const { warn } = effects

  // App renderer / creates state cell that is passed to controls
  const r = makeRenderer(element, mainCtrl)

  // Start app / the big bang!
  r(initialState, effects)

  warn('ETH detected', ethDetected)
}
