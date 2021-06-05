import * as R from 'ramda'
import { localNet, testNet, mainNet, getNodeUrls, RChainNetwork, NodeUrls } from '../rchain-networks'
import { ethDetected } from '@tgrospic/rnode-http-js'
import { newRevAccount, RevAccount } from '@tgrospic/rnode-http-js'
import { h, makeRenderer, handleHashHref, Cell } from './common'

// Controls
import { selectorCtrl, SelectorSt } from './selector-ctrl'
import { addressCtrl, AddressSt } from './address-ctrl'
import { balanceCtrl, BalanceSt } from './balance-ctrl'
import { transferCtrl, TransferData, TransferSt } from './transfer-ctrl'
import { customDeployCtrl, CustomDeploySt, SendDeployArgs } from './custom-deploy-ctrl'
import { Lens } from 'monocle-ts'
import { Predicate } from 'fp-ts/lib/function'
import { AppRNodeEffects, ConsoleEff } from '../rnode-actions'

/*
  This will display the test page to select local, testnet, and mainnet validators
  and make REV transfers and check balance.
*/

export interface AppState {
  nets: RChainNetwork[]
  wallet: RevAccount[]
  // Control states
  sel: SelectorSt
  balance: BalanceSt
  address: AddressSt
  transfer: TransferSt
  customDeploy: CustomDeploySt
}

export type AppEffects = AppRNodeEffects & ConsoleEff

const repoUrl = 'https://github.com/tgrospic/rnode-client-js'

const mainCtrl = (st: Cell<AppState>, effects: AppEffects) => {
  const { appCheckBalance, appTransfer, appOfflineTransfer, appSendDeploy, appPropose, log, warn } = effects

  const onCheckBalance = (node: NodeUrls) => (revAddr: string) => appCheckBalance({node, revAddr})

  const onTransfer = (node: NodeUrls, setStatus: (s: string) => any) => ({fromAccount, toAccount, amount}: TransferData) =>
    appTransfer({node, fromAccount, toAccount, amount, setStatus})

  const onOfflineTransfer = (node: NodeUrls, setStatus: (s: string) => any) => ({fromAccount, toAccount, amount}: TransferData) =>
    appOfflineTransfer({node, fromAccount, toAccount, amount, setStatus})

  const onSendDeploy = (node: NodeUrls, setStatus: (s: string) => any) => ({code, account, phloLimit}: SendDeployArgs) =>
    appSendDeploy({node, code, account, phloLimit, setStatus})

  const onPropose = (node: NodeUrls) => () => appPropose(node)

  const appendUpdateLens = (pred: Predicate<RevAccount>) => new Lens<RevAccount[], RevAccount>(
    xs => R.find(pred, xs) as RevAccount,
    x => xs => {
      const idx = R.findIndex(pred, xs)
      const apply = idx === -1 ? R.append : ((ys: any) => R.update<RevAccount>(idx, ys))
      return apply(x)(xs)
    })

  const onSaveAccount = (account: RevAccount) =>
    st.o('wallet')
      .ol(appendUpdateLens(R.propEq('revAddr', account.revAddr)))
      .set(account)

  // State lenses for each control
  const selSt          = st.o('sel')
  const addressSt      = st.o('address')
  const balanceSt      = st.o('balance')
  const transferSt     = st.o('transfer')
  const customDeploySt = st.o('customDeploy')

  const {nets, sel, wallet} = st.view()
  const valNodeUrls  = getNodeUrls(sel.valNode)
  const readNodeUrls = getNodeUrls(sel.readNode)

  const setTransferStatus = transferSt.o('status').set
  const setDeployStatus   = customDeploySt.o('status').set

  // App render
  return <div class={sel.valNode.name} onClick={handleHashHref}>
    <div class="ctrl">
      Demo client for RNode <a href={repoUrl} target="_blank">{repoUrl}</a>
      <h1>RNode client testing page</h1>
    </div>
    {/* Selector control */}
    <hr/>
    {selectorCtrl(selSt, {nets})}

    {/* REV wallet control */}
    {addressCtrl(addressSt, {wallet, onAddAccount: onSaveAccount})}

    {/* Check balance control */}
    {balanceCtrl(balanceSt, {wallet, onCheckBalance: onCheckBalance(readNodeUrls)})}

    {/* Transfer REV control */}
    <hr/>
    {transferCtrl(transferSt, {
      wallet, warn,
      onTransfer: onTransfer(valNodeUrls, setTransferStatus),
      onOfflineTransfer: onOfflineTransfer(valNodeUrls, setTransferStatus),
    })}

    {/* Custom deploy control */}
    <hr/>
    {customDeployCtrl(customDeploySt, {
      wallet, node: valNodeUrls,
      onSendDeploy: onSendDeploy(valNodeUrls, setDeployStatus),
      onPropose: onPropose(valNodeUrls),
      warn,
    })}
  </div>
}

const nets = [localNet, testNet, mainNet]
  .map(({title, name, hosts, readOnlys}) => ({
    title, name,
    hosts: hosts.map(x => ({...x, title, name})),
    readOnlys: readOnlys.map(x => ({...x, title, name})),
  }))

const defaultWallet: RevAccount[] = [
  { name: 'New account', ...newRevAccount() },
]

const initNet = nets[0]

// Initial application state
const initialState: Partial<AppState> = {
  // Validators to choose
  nets,
  // Selected validator
  sel: { valNode: initNet.hosts[0], readNode: initNet.readOnlys[0] },
  // Initial wallet
  wallet: [], //defaultWallet,

  // transfer: {
  //   amount: ''
  // }
}

export const startApp = (element: Element, effects: AppEffects) => {
  const { warn } = effects

  // App renderer / creates state cell that is passed to controls
  const r = makeRenderer(element, mainCtrl)

  // Start app / the big bang!
  r(initialState, effects)

  warn('ETH detected', ethDetected)
}
