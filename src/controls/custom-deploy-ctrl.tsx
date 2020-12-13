import * as R from 'ramda'
import { RevAccount } from '@tgrospic/rnode-http-js'
import { NodeUrls } from '../rchain-networks'
import { h, labelStyle, showRevDecimal, labelRev, showNetworkError, Cell } from './common'

const sampleReturnCode = `new return(\`rho:rchain:deployId\`) in {
  return!((42, true, "Hello from blockchain!"))
}`

const sampleInsertToRegistry = `new return(\`rho:rchain:deployId\`),
  insertArbitrary(\`rho:registry:insertArbitrary\`)
in {
  new uriCh, valueCh in {
    insertArbitrary!("My value", *uriCh) |
    for (@uri <- uriCh) {
      return!(("URI", uri))
    }
  }
}`

const sampleRegistryLookup = `new return(\`rho:rchain:deployId\`),
  lookup(\`rho:registry:lookup\`)
in {
  new valueCh in {
    // Fill in registry URI: \`rho:id:11fhnau8j3...h4459w9bpus6oi\`
    lookup!( <registry_uri> , *valueCh) |
    for (@value <- valueCh) {
      return!(("Value from registry", value))
    }
  }
}`

const samples = [
  ['return data', sampleReturnCode],
  ['insert to registry', sampleInsertToRegistry],
  ['registry lookup', sampleRegistryLookup],
]

export interface CustomDeploySt {
  selRevAddr: string
  code: string
  phloLimit: string
  status: string
  dataError: string
  proposeStatus: string
  proposeError: string
}

export type SendDeployArgs = {code: string, account: RevAccount, phloLimit: string}

export interface CustomDeployActions {
  readonly wallet: RevAccount[]
  readonly node: NodeUrls
  onSendDeploy(d: SendDeployArgs): Promise<string>
  onPropose(node: NodeUrls): Promise<string>
  warn: typeof console.warn
}

const initSelected = (st: CustomDeploySt, wallet: RevAccount[]) => {
  const {selRevAddr, phloLimit = '250000'} = st

  // Pre-select first account if not selected
  const initRevAddr = R.isNil(selRevAddr) && !R.isNil(wallet) && !!wallet.length
    ? R.head(wallet)?.revAddr : selRevAddr

  return {...st, selRevAddr: initRevAddr, phloLimit}
}

export const customDeployCtrl = (st: Cell<CustomDeploySt>, {wallet = [], node, onSendDeploy, onPropose, warn}: CustomDeployActions) => {
  const onSendDeployEv = (code: string) => async () => {
    st.update(s => ({...s, status: '...', dataError: ''}))

    const account = R.find(R.propEq('revAddr', selRevAddr), wallet) as RevAccount
    const [status, dataError] = await onSendDeploy({code, account, phloLimit})
      .then(x => [x, ''])
      .catch(ex => {
        warn('DEPLOY ERROR', ex)
        return ['', ex.message]
      })

    st.update(s => ({...s, status, dataError}))
  }

  const onProposeEv = async () => {
    st.update(s => ({...s, proposeStatus: '...', proposeError: ''}))

    const [proposeStatus, proposeError] = await onPropose(node)
      .then(x => [x, ''])
      .catch(ex => ['', ex.message])

    st.update(s => ({...s, proposeStatus, proposeError}))
  }

  const accountChangeEv = (ev: any) => {
    const { revAddr } = wallet[ev.target.selectedIndex]
    st.update(s => ({...s, selRevAddr: revAddr}))
  }

  const updateCodeEv = (code: string) => () => {
    st.update(s => ({...s, code}))
  }

  // Field update by name
  const valEv = (name: keyof CustomDeploySt) => (ev: any) => {
    const val = ev.target.value
    st.update(s => ({...s, [name]: val}))
  }

  // Control state
  const {selRevAddr, code, phloLimit, status, dataError, proposeStatus, proposeError}
    = initSelected(st.view({}), wallet)

  const labelAddr        = 'Signing account'
  const labelCode        = 'Rholang code'
  const labelPhloLimit   = 'Phlo limit (in revlettes x10^8)'
  const isWalletEmpty    = R.isNil(wallet) || R.isEmpty(wallet)
  const showPropose      = node.network === 'localnet'
  const canDeploy        = (code || '').trim() !== '' && !!selRevAddr
  const phloLimitPreview = showRevDecimal(phloLimit)

  return <div class="ctrl custom-deploy-ctrl">
    <h2>Custom deploy</h2>
    {isWalletEmpty ? <b>REV wallet is empty, add accounts to make deploys.</b> : <>
      <span>Send deploy to selected validator RNode.</span>

      {/* Rholang examples */}
      <div>
        <span>Sample code: </span>
        {samples.map(([title, code]) =>
          <a href="#" onClick={updateCodeEv(code)}>{title}</a>
        )}
      </div>

      {/* REV address dropdown */}
      <div {...labelStyle(!!selRevAddr)}>{labelAddr}</div>
      <select onChange={accountChangeEv}>
        {wallet.map(({name, revAddr}) =>
          <option>{name}: {revAddr}</option>
        )}
      </select>

      {/* Rholang code (editor) */}
      <div {...labelStyle(!!code)}>{labelCode}</div>
      <textarea class="deploy-code"
        value={code} rows={13} placeholder="Rholang code"
        onInput={valEv('code')}>
      </textarea>

      {/* Phlo limit */}
      <div {...labelStyle(true)}>{labelPhloLimit}</div>
      <input type="number" class="phlo-limit"
        value={phloLimit} placeholder={labelPhloLimit} onInput={valEv('phloLimit')} />
      {labelRev(phloLimitPreview)}

      {/* Action buttons / results */}
      <div></div>
      <button onClick={onSendDeployEv(code)} disabled={!canDeploy}>Deploy Rholang code</button>
      {status && <b>{status}</b>}
      {dataError && <b class="warning">{showNetworkError(dataError)}</b>}

      {/* Propose */}
      <div></div>
      {showPropose && <button onClick={onProposeEv}>Propose</button>}
      {showPropose && proposeStatus && <b>{proposeStatus}</b>}
      {showPropose && proposeError && <b class="warning">{showNetworkError(proposeError)}</b>}
    </>}
  </div>
}
