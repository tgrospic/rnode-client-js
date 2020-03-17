// // @ts-check
import * as R from 'ramda'
import m from 'mithril'
import { newRevAddr } from '@tgrospic/rnode-grpc-js'
import { localNet, testNet, mainNet, getNodeUrls } from '../../rchain-networks.js'
import { rnodeHttp, sendDeploy, getDataForDeploy } from '../../rnode-web.js'
import { transferFunds_rho } from '../../rho/transfer-funds.js'
import { checkBalance_rho } from '../../rho/check-balance'
import { ethDetected } from '../../eth/eth-wrapper'
import { mkCell } from './common'

// Controls
import { selectorCtrl } from './selector-ctrl'
import { addressCtrl } from './address-ctrl'
import { balanceCtrl } from './balance-ctrl'
import { transferCtrl } from './transfer-ctrl'
import { customDeployCtrl } from './custom-deploy-ctrl'

/*
  This will display the test page to select local, testnet, and mainnet validators
  and make REV transfers and check balance.
*/

const { log, warn } = console

const repoUrl = 'https://github.com/tgrospic/rnode-client-js'

const mainCtrl = st => {
  const {nets, sel, wallet} = st.view()
  const valNodeUrls  = getNodeUrls(sel.valNode)
  const readNodeUrls = getNodeUrls(sel.readNode)

  // Control states
  const selSt          = st.o('sel')
  const addressSt      = st.o('address')
  const balanceSt      = st.o('balance')
  const transferSt     = st.o('transfer')
  const customDeploySt = st.o('customDeploy')

  const onCheckBalance = async revAddr => {
    const deloyCode   = checkBalance_rho(revAddr)
    const {expr: [e]} = await rnodeHttp(readNodeUrls.httpUrl, 'explore-deploy', deloyCode)
    const dataBal     = e && e.ExprInt && e.ExprInt.data
    const dataError   = e && e.ExprString && e.ExprString.data
    return [dataBal, dataError]
  }

  const parseResponse = data => {
    if (R.isNil(data)) return
    // Data from RNode response written in deploy code
    // - return!("One argument")   // monadic
    // - return!((true, A, B))     // monadic as tuple
    // - return!(true, A, B)       // polyadic
    // new return(`rho:rchain:deployId`) in {
    //   return!((true, "Hello from blockchain!"))
    // }
    const args = R.path(['expr', 'ExprTuple', 'data'], data)
      || R.path(['expr', 'ExprPar', 'data'], data)
      || [R.path(['expr'], data)]

    if (!args) return

    // Extract field data `{TypeName: data}`
    const getField = obj => {
      const key = Object.keys(obj)[0]
      return R.path([key, 'data'], obj)
    }
    return args.map(getField)
  }

  const onTransfer = async ({fromAccount, toAccount, amount}) => {
    log('TRANSFER', {amount, from: fromAccount.name, to: toAccount.name})
    const code = transferFunds_rho(fromAccount.revAddr, toAccount.revAddr, amount)
    const statusSet  = transferSt.o('status').set
    statusSet(`Deploying ...`)

    // Send deploy
    const {signature} = await sendDeploy(valNodeUrls, fromAccount, code)
    log('DEPLOY ID (signature)', signature)

    // Progress dots
    const mkProgress = i => () => {
      i = i > 60 ? 0 : i + 3
      return `Checking result ${R.repeat('.', i).join('')}`
    }
    const progressStep   = mkProgress(0)
    const updateProgress = _ => statusSet(progressStep())
    updateProgress()

    // Try to get result from next proposed block
    const {data, cost} = await getDataForDeploy(valNodeUrls, signature, updateProgress)
    // Extract data from response object
    const args               = parseResponse(data)
    const costTxt            = R.isNil(cost) ? 'Failed to retrive' : cost
    const [success, message] = args || [false, 'Failed to get data']

    if (!success) throw Error(`Transfer error: ${message}. // cost: ${costTxt}`)
    return `✓ ${message} // cost: ${costTxt}`
  }

  const onSendDeploy = async ({code, account}) => {
    log('SEND DEPLOY', {account: account.name, code})
    const deployStatusSet = customDeploySt.o('status').set
    deployStatusSet(`Deploying ...`)

    const {signature} = await sendDeploy(valNodeUrls, account, code)
    log('DEPLOY ID (signature)', signature)

    // Progress dots
    const mkProgress = i => () => {
      i = i > 60 ? 0 : i + 3
      return `Checking result ${R.repeat('.', i).join('')}`
    }
    const progressStep   = mkProgress(0)
    const updateProgress = _ => deployStatusSet(progressStep())
    updateProgress()

    // Try to get result from next proposed block
    const {data, cost} = await getDataForDeploy(valNodeUrls, signature, updateProgress)
    // Extract data from response object
    const args               = parseResponse(data)
    const costTxt            = R.isNil(cost) ? 'Failed to retrive' : cost
    const [success, message] = R.isNil(args)
      ? [false, 'Failed to get data']
      : [true, args.join(', ')]

    log('DEPLOY RETURN DATA', {args, cost, rawData: data})

    if (!success) throw Error(`Deploy error: ${message}. // cost: ${costTxt}`)
    return `✓ (${message}) // cost: ${costTxt}`
  }

  const appendUpdateLens = pred => R.lens(R.find(pred), (x, xs) => {
    const idx = R.findIndex(pred, xs)
    // @ts-ignore
    const apply = idx === -1 ? R.append : R.update(idx)
    return apply(x, xs)
  })

  const onSaveAccount = account =>
    st.o('wallet')
      .o(appendUpdateLens(R.propEq('revAddr', account.revAddr)))
      .set(account)

  // App render
  return m(`.${sel.valNode.name}`,
    m('.ctrl',
      'Demo client for RNode ',
      m('a', {href: repoUrl, target: '_blank'}, repoUrl),
      m('h1', 'RNode client testing page'),
    ),
    selectorCtrl(selSt, {nets}),
    addressCtrl(addressSt, {wallet, onAddAccount: onSaveAccount}),
    balanceCtrl(balanceSt, {wallet, onCheckBalance}),
    m('hr'),
    transferCtrl(transferSt, {wallet, onTransfer}),
    m('hr'),
    customDeployCtrl(customDeploySt, {wallet, onSendDeploy}),
  )
}

const nets = [localNet, testNet, mainNet]
  .map(({title, name, hosts, readOnlys}) => ({
    title, name,
    hosts: hosts.map(x => ({...x, title, name})),
    readOnlys: readOnlys.map(x => ({...x, title, name})),
  }))

// Wraps Virtual DOM renderer to render state
const makeRenderer = (element, view) => state => {
  const stateCell = mkCell()
  const render = () => {
    m.render(element, view(stateCell))
  }
  stateCell.setListener(render)
  stateCell.set(state)
}

const initNet = nets[0]
const initialState = {
  // Validators to choose
  nets,
  // Selected validator
  sel: { valNode: initNet.hosts[0], readNode: initNet.readOnlys[0] },
  // Initial wallet
  wallet: [], // [{name: 'My REV account', ...newRevAddr()}]
}

export const startApp = () => {
  // App renderer / creates state cell that is passed to controls
  const r = makeRenderer(document.querySelector('#app'), mainCtrl)

  // Start app / the big bang!
  r(initialState)

  warn('ETH detected', ethDetected)
}
