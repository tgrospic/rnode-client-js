import * as R from 'ramda'
import { checkBalance_rho } from '../rho/check-balance'
import { transferFunds_rho } from '../rho/transfer-funds'

export const makeRNodeActions = (rnodeWeb, {log, warn}) => {
  const { rnodeHttp, sendDeploy, getDataForDeploy, propose } = rnodeWeb

  // App actions to process communication with RNode
  return {
    appCheckBalance: appCheckBalance({rnodeHttp}),
    appTransfer    : appTransfer({sendDeploy, getDataForDeploy, propose, log, warn}),
    appSendDeploy  : appSendDeploy({sendDeploy, getDataForDeploy, log}),
    appPropose     : appPropose({propose, log}),
  }
}

const appCheckBalance = ({rnodeHttp}) => async ({node, revAddr}) => {
  const deployCode  = checkBalance_rho(revAddr)
  const {expr: [e]} = await rnodeHttp(node.httpUrl, 'explore-deploy', deployCode)
  const dataBal     = e && e.ExprInt && e.ExprInt.data
  const dataError   = e && e.ExprString && e.ExprString.data
  return [dataBal, dataError]
}

const appTransfer = effects => async ({node, fromAccount, toAccount, amount, setStatus}) => {
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
  const mkProgress = i => () => {
    i = i > 60 ? 0 : i + 3
    return `Checking result ${R.repeat('.', i).join('')}`
  }
  const progressStep   = mkProgress(0)
  const updateProgress = _ => setStatus(progressStep())
  updateProgress()

  // Try to get result from next proposed block
  const {data, cost} = await getDataForDeploy(node, signature, updateProgress)
  // Extract data from response object
  const args               = data ? rhoExprToJS(data.expr) : void 0
  const costTxt            = R.isNil(cost) ? 'failed to retrive' : cost
  const [success, message] = args || [false, 'deploy found in the block but failed to get confirmation data']

  if (!success) throw Error(`Transfer error: ${message}. // cost: ${costTxt}`)
  return `✓ ${message} // cost: ${costTxt}`
}

const appSendDeploy = effects => async ({node, code, account, phloLimit, setStatus}) => {
  const {sendDeploy, getDataForDeploy, log} = effects

  log('SENDING DEPLOY', {account: account.name, phloLimit, node: node.httpUrl, code})

  setStatus(`Deploying ...`)

  const {signature} = await sendDeploy(node, account, code, phloLimit)
  log('DEPLOY ID (signature)', signature)

  // Progress dots
  const mkProgress = i => () => {
    i = i > 60 ? 0 : i + 3
    return `Checking result ${R.repeat('.', i).join('')}`
  }
  const progressStep   = mkProgress(0)
  const updateProgress = _ => setStatus(progressStep())
  updateProgress()

  // Try to get result from next proposed block
  const {data, cost} = await getDataForDeploy(node, signature, updateProgress)
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

const appPropose = ({propose, log}) => async ({httpAdminUrl}) => {
  const resp = await propose({httpAdminUrl})

  log('Propose result', resp)

  return resp
}

// Converts RhoExpr response from RNode WebAPI
// https://github.com/rchain/rchain/blob/b7331ae05/node/src/main/scala/coop/rchain/node/api/WebApi.scala#L128-L147
// - return!("One argument")   // monadic
// - return!((true, A, B))     // monadic as tuple
// - return!(true, A, B)       // polyadic
// new return(`rho:rchain:deployId`) in {
//   return!((true, "Hello from blockchain!"))
// }
// TODO: make it stack safe
const rhoExprToJS = input => {
  const loop = rhoExpr => convert(rhoExpr)(converters)
  const converters = R.toPairs(converterMapping(loop))
  return loop(input)
}

const convert = rhoExpr => R.pipe(
  R.map(matchTypeConverter(rhoExpr)),
  R.find(x => !R.isNil(x)),
  // Return the whole object if unknown type
  x => R.isNil(x) ? [R.identity, rhoExpr] : x,
  ([f, d]) => f(d)
)

const matchTypeConverter = rhoExpr => ([type, f]) => {
  const d = R.path([type, 'data'], rhoExpr)
  return R.isNil(d) ? void 666 : [f, d]
}

const converterMapping = loop => ({
  "ExprInt": R.identity,
  "ExprBool": R.identity,
  "ExprString": R.identity,
  "ExprBytes": R.identity,
  "ExprUri": R.identity,
  "UnforgDeploy": R.identity,
  "UnforgDeployer": R.identity,
  "UnforgPrivate": R.identity,
  "ExprUnforg": loop,
  "ExprPar": R.map(loop),
  "ExprTuple": R.map(loop),
  "ExprList": R.map(loop),
  "ExprMap": R.mapObjIndexed(loop),
})
