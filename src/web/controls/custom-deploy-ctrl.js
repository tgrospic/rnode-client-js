import m from 'mithril'
import * as R from 'ramda'
import { labelStyle } from './common'

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

const initSelected = (st, wallet) => {
  const {account} = st

  // Pre-select first account if not selected
  const selAccount = R.isNil(account) && !R.isNil(wallet)
    ? R.head(wallet) : account

  return {...st, account: selAccount}
}

export const customDeployCtrl = (st, {wallet = [], onSendDeploy}) => {
  const {account, code, status, dataError} = initSelected(st.view({}), wallet)

  const onSendDeployEv = code => async _ => {
    st.update(s => ({...s, status: '...', dataError: ''}))

    const [status, dataError] = await onSendDeploy({code, account})
      .then(x => [x, ''])
      .catch(ex => {
        console.warn('DEPLOY ERROR', ex)
        return ['', ex.message]
      })

    st.update(s => ({...s, status, dataError}))
  }

  const accountChangeEv = ev => {
    const account = wallet[ev.target.selectedIndex]
    st.update(s => ({...s, account}))
  }

  const onCodeChangeEv = ev => {
    const code = ev.target.value
    st.update(s => ({...s, code}))
  }

  const updateCodeEv = code => _ => {
    st.update(s => ({...s, code}))
  }

  const labelAddr     = 'Signing account'
  const labelCode     = 'Rholang code'
  const isWalletEmpty = R.isNil(wallet) || R.isEmpty(wallet)

  return m('.ctrl.custom-deploy-ctrl',
    m('h2', 'Custom deploy'),
    isWalletEmpty ? m('b', 'REV wallet is empty, add accounts to make deploys.') : [
      m('span', 'Send deploy to selected validator RNode.'),
      m('',
        m('span', 'Sample code: '),
        samples.map(([title, code]) =>
          m('a', {onclick: updateCodeEv(code), href: 'javascript:void 0'}, title),
        )
      ),
      m('', labelStyle(account), labelAddr),
      m('select', {onchange: accountChangeEv},
        wallet.map(({name, revAddr}) =>
          m('option', `${name}: ${revAddr}`)
        ),
      ),
      m('', labelStyle(code), labelCode),
      m('textarea.deploy-code', {value: code, rows: 13, placeholder: 'Rholang code', oninput: onCodeChangeEv}),
      m(''),
      m('button', {onclick: onSendDeployEv(code), disabled: !account}, 'Deploy Rholang code'),
      m('b', status),
      m('b.warning', dataError),
    ]
  )
}
