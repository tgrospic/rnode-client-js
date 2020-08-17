// // @ts-check
import * as R from 'ramda'
import m from 'mithril'
import { localNet, testNet, mainNet, getNodeUrls } from '../../rchain-networks'
import { rnodeHttp, sendDeploy, getDataForDeploy, propose } from '../../rnode-web'
import { transferFunds_rho } from '../../rho/transfer-funds'
import { checkBalance_rho } from '../../rho/check-balance'
import { ethDetected } from '../../eth/eth-wrapper'
import { mkCell, rhoExprToJS } from './common'

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

  const onCheckBalance = async revAddr => {
    const deloyCode   = checkBalance_rho(revAddr)
    const {expr: [e]} = await rnodeHttp(readNodeUrls.httpUrl, 'explore-deploy', deloyCode)
    const dataBal     = e && e.ExprInt && e.ExprInt.data
    const dataError   = e && e.ExprString && e.ExprString.data
    return [dataBal, dataError]
  }

  const onTransfer = async ({fromAccount, toAccount, amount}) => {
    log('TRANSFER', {amount, from: fromAccount.name, to: toAccount.name})
    const code = transferFunds_rho(fromAccount.revAddr, toAccount.revAddr, amount)
    const statusSet  = transferSt.o('status').set
    statusSet(`Deploying ...`)

    // Send deploy
    const {signature} = await sendDeploy(valNodeUrls, fromAccount, code)
    log('DEPLOY ID (signature)', signature)

    if (valNodeUrls.network === 'localnet') {
      // Propose on local network, don't wait for result
      propose(valNodeUrls).catch(ex => console.error(ex))
    }

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
    const args               = data ? rhoExprToJS(data.expr) : void 0
    const costTxt            = R.isNil(cost) ? 'failed to retrive' : cost
    const [success, message] = args || [false, 'deploy found in the block but failed to get confirmation data']

    if (!success) throw Error(`Transfer error: ${message}. // cost: ${costTxt}`)
    return `✓ ${message} // cost: ${costTxt}`
  }

  const onSendDeploy = async ({code, account, phloLimit}) => {
    log('SENDING DEPLOY', {account: account.name, phloLimit, node: valNodeUrls.httpUrl, code})

    const deployStatusSet = customDeploySt.o('status').set
    deployStatusSet(`Deploying ...`)

    const {signature} = await sendDeploy(valNodeUrls, account, code, phloLimit)
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
    const args               = data ? rhoExprToJS(data.expr) : void 0
    const costTxt            = R.isNil(cost) ? 'failed to retrive' : cost
    const [success, message] = R.isNil(args)
      ? [false, 'deploy found in the block but data is not sent on `rho:rchain:deployId` channel']
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

  // State lenses for each control
  const selSt          = st.o('sel')
  const addressSt      = st.o('address')
  const balanceSt      = st.o('balance')
  const transferSt     = st.o('transfer')
  const customDeploySt = st.o('customDeploy')

  // App render
  return m(`.${sel.valNode.name}`,
    m('.ctrl',
      'Demo client for RNode ',
      m('a', {href: repoUrl, target: '_blank'}, repoUrl),
      m('h1', 'RNode client testing page'),
    ),

    // Selector control
    m('hr'),
    selectorCtrl(selSt, {nets}),

    // REV wallet control
    addressCtrl(addressSt, {wallet, onAddAccount: onSaveAccount}),

    // Check balance control
    balanceCtrl(balanceSt, {wallet, onCheckBalance}),
    m('hr'),

    // Transfer REV control
    transferCtrl(transferSt, {wallet, onTransfer}),

    // Custom deploy control
    m('hr'),
    customDeployCtrl(customDeploySt, {wallet, node: valNodeUrls, onSendDeploy, onPropose: propose}),
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
