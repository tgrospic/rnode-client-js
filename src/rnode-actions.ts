import * as R from 'ramda'
import { GetDeployDataEff, ProposeEff, RawRNodeHttpEff, RNodeWebAPI, SendDeployEff } from '@tgrospic/rnode-http-js'
import { RevAccount, rhoExprToJson } from '@tgrospic/rnode-http-js'
import { NodeUrls } from './rchain-networks'
import { checkBalance_rho } from './rho/check-balance'
import { transferFunds_rho } from './rho/transfer-funds'
import { ConsoleLog, ConsoleWarn } from './controls/common'

export type ConsoleEff = ConsoleLog & ConsoleWarn

export type AppRNodeEffects = {
  appCheckBalance(args: AppCheckBalanceArgs): Promise<[number, string]>
  appTransfer(args: AppTransferArgs): Promise<string>
  appSendDeploy(args: AppSendDeployArgs): Promise<string>
  appPropose(args: NodeUrls): Promise<string>
}

export const makeRNodeActions = function (rnodeWeb: RNodeWebAPI, {log, warn}: ConsoleEff): AppRNodeEffects {
  const { rnodeHttp, sendDeploy, getDataForDeploy, propose } = rnodeWeb

  // App actions to process communication with RNode
  return {
    appCheckBalance: appCheckBalance({rnodeHttp}),
    appTransfer    : appTransfer({sendDeploy, getDataForDeploy, propose, log, warn}),
    appSendDeploy  : appSendDeploy({sendDeploy, getDataForDeploy, log}),
    appPropose     : appPropose({propose, log}),
  }
}

export type AppCheckBalanceArgs = {node: NodeUrls, revAddr: string}

const appCheckBalance = ({rnodeHttp}: RawRNodeHttpEff) => async function ({node, revAddr}: AppCheckBalanceArgs): Promise<[number, string]> {
  const deployCode  = checkBalance_rho(revAddr)
  const {expr: [e]} = await rnodeHttp(node.httpUrl, 'explore-deploy', deployCode)
  const dataBal     = e && e.ExprInt && e.ExprInt.data
  const dataError   = e && e.ExprString && e.ExprString.data
  return [dataBal, dataError]
}

export type AppTransferEff = SendDeployEff & GetDeployDataEff & ProposeEff & ConsoleEff

export type AppTransferArgs = {
  readonly node: NodeUrls
  readonly fromAccount: RevAccount
  readonly toAccount: RevAccount
  readonly amount: string
  setStatus(msg: string): any
}

const appTransfer = (effects: AppTransferEff) => async function ({node, fromAccount, toAccount, amount, setStatus}: AppTransferArgs) {
  const {sendDeploy, getDataForDeploy, propose, log, warn} = effects

  log('TRANSFER', {amount, from: fromAccount.name, to: toAccount.name, node: node.httpUrl})

  setStatus(`Deploying ...`)

  // Send deploy
  const code = transferFunds_rho(fromAccount.revAddr, toAccount.revAddr, amount)
  const {signature} = await sendDeploy(node, fromAccount, code)
  log('DEPLOY ID (signature)', signature)

  if (node.network === 'localnet') {
    // Propose on local network, don't wait for result
    propose(node).catch(ex => warn(ex))
  }

  // Progress dots
  const mkProgress = (i: number) => () => {
    i = i > 60 ? 0 : i + 3
    return `Checking result ${R.repeat('.', i).join('')}`
  }
  const progressStep   = mkProgress(0)
  const updateProgress = () => setStatus(progressStep())
  updateProgress()

  // Try to get result from next proposed block
  const {data, cost} = await getDataForDeploy(node, signature, updateProgress)
  // Extract data from response object
  const args               = data ? rhoExprToJson(data.expr) : void 0
  const costTxt            = R.isNil(cost) ? 'failed to retrive' : cost
  const [success, message] = args || [false, 'deploy found in the block but failed to get confirmation data']

  if (!success) throw Error(`Transfer error: ${message}. // cost: ${costTxt}`)
  return `✓ ${message} // cost: ${costTxt}`
}

export type AppSendDeployEff = SendDeployEff & GetDeployDataEff & ConsoleLog

export type AppSendDeployArgs = {
  readonly node: NodeUrls
  readonly code: string
  readonly account: RevAccount
  readonly phloLimit: string
  setStatus(msg: string): any
}

const appSendDeploy = (effects: AppSendDeployEff) => async function ({node, code, account, phloLimit, setStatus}: AppSendDeployArgs) {
  const {sendDeploy, getDataForDeploy, log} = effects

  log('SENDING DEPLOY', {account: account.name, phloLimit, node: node.httpUrl, code})

  setStatus(`Deploying ...`)

  const phloLimitNum = R.isNil(phloLimit) ? phloLimit : parseInt(phloLimit)

  const {signature} = await sendDeploy(node, account, code, phloLimitNum)
  log('DEPLOY ID (signature)', signature)

  // Progress dots
  const mkProgress = (i: number) => () => {
    i = i > 60 ? 0 : i + 3
    return `Checking result ${R.repeat('.', i).join('')}`
  }
  const progressStep   = mkProgress(0)
  const updateProgress = () => setStatus(progressStep())
  updateProgress()

  // Try to get result from next proposed block
  const {data, cost} = await getDataForDeploy(node, signature, updateProgress)
  // Extract data from response object
  const args = data ? rhoExprToJson(data.expr) : void 0

  log('DEPLOY RETURN DATA', {args, cost, rawData: data})

  const costTxt            = R.isNil(cost) ? 'failed to retrive' : cost
  const [success, message] = R.isNil(args)
    ? [false, 'deploy found in the block but data is not sent on `rho:rchain:deployId` channel']
    : [true, R.is(Array, args) ? args.join(', ') : args]

  if (!success) throw Error(`Deploy error: ${message}. // cost: ${costTxt}`)
  return `✓ (${message}) // cost: ${costTxt}`
}

type AppProposeEff = ProposeEff & ConsoleLog

const appPropose = ({propose, log}: AppProposeEff) => async function ({httpAdminUrl}: NodeUrls) {
  const resp = await propose({httpAdminUrl})

  log('Propose result', resp)

  return resp
}
