// @ts-check
import m from 'mithril'
import * as R from 'ramda'
import { labelStyle, showTokenDecimal, labelRev, showNetworkError } from './common'

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

/**
 * @param { import("@tgrospic/rnode-grpc-js").RevAddress[] } wallet
 */
const initSelected = (st, wallet /** @param any[] */) => {
  const {selRevAddr, phloLimit = 500e3} = st

  // Pre-select first account if not selected
  const initRevAddr = R.isNil(selRevAddr) && !R.isNil(wallet) && !!wallet.length
    ? R.head(wallet).revAddr : selRevAddr

  return {...st, selRevAddr: initRevAddr, phloLimit}
}

export const customDeployCtrl = (st, {wallet = [], node, onSendDeploy, onPropose, warn}) => {
  const onSendDeployEv = code => async _ => {
    st.update(s => ({...s, status: '...', dataError: ''}))

    const account = R.find(R.propEq('revAddr', selRevAddr), wallet)
    const [status, dataError] = await onSendDeploy({code, account, phloLimit})
      .then(x => [x, ''])
      .catch(ex => {
        warn('DEPLOY ERROR', ex)
        return ['', ex.message]
      })

    st.update(s => ({...s, status, dataError}))
  }

  const onProposeEv = async _ => {
    st.update(s => ({...s, proposeStatus: '...', proposeError: ''}))

    const [proposeStatus, proposeError] = await onPropose(node)
      .then(x => [x, ''])
      .catch(ex => ['', ex.message])

    st.update(s => ({...s, proposeStatus, proposeError}))
  }

  const accountChangeEv = ev => {
    const { revAddr } = wallet[ev.target.selectedIndex]
    st.update(s => ({...s, selRevAddr: revAddr}))
  }

  const updateCodeEv = code => _ => {
    st.update(s => ({...s, code}))
  }

  // Field update by name
  const valEv = name => ev => {
    const val = ev.target.value
    st.update(s => ({...s, [name]: val}))
  }

  // Control state
  const {selRevAddr, code, phloLimit, status, dataError, proposeStatus, proposeError}
    = initSelected(st.view({}), wallet)

  const tokenName        = node.tokenName
  const labelAddr        = 'Signing account'
  const labelCode        = 'Rholang code'
  const labelPhloLimit   = `Phlo limit (in tiny ${tokenName} x10^${node.tokenDecimal})`
  const isWalletEmpty    = R.isNil(wallet) || R.isEmpty(wallet)
  const showPropose      = node.network === 'localnet'
  const canDeploy        = (code || '').trim() !== '' && !!selRevAddr
  const phloLimitPreview = showTokenDecimal(phloLimit, node.tokenDecimal)

  return m('.ctrl.custom-deploy-ctrl',
    m('h2', 'Custom deploy'),
    isWalletEmpty ? m('b', `${node.tokenName} wallet is empty, add accounts to make deploys.`) : [
      m('span', 'Send deploy to selected validator RNode.'),

      // Rholang examples
      m('',
        m('span', 'Sample code: '),
        samples.map(([title, code]) =>
          m('a', {onclick: updateCodeEv(code), href: '#'}, title),
        )
      ),

      // REV address dropdown
      m('', labelStyle(!!selRevAddr), labelAddr),
      m('select', {onchange: accountChangeEv},
        wallet.map(({name, revAddr}) =>
          m('option', `${name}: ${revAddr}`)
        ),
      ),

      // Rholang code (editor)
      m('', labelStyle(code), labelCode),
      m('textarea.deploy-code', {value: code, rows: 13, placeholder: 'Rholang code', oninput: valEv('code')}),

      // Phlo limit
      m('', labelStyle(true), labelPhloLimit),
      m('input[type=number].phlo-limit', {
        value: phloLimit, placeholder: labelPhloLimit, oninput: valEv('phloLimit')
      }),
      labelRev(phloLimitPreview, tokenName),

      // Action buttons / results
      m(''),
      m('button', {onclick: onSendDeployEv(code), disabled: !canDeploy}, 'Deploy Rholang code'),
      status && m('b', status),
      dataError && m('b.warning', showNetworkError(dataError)),

      m(''),
      showPropose && m('button', {onclick: onProposeEv}, 'Propose'),
      showPropose && proposeStatus && m('b', proposeStatus),
      showPropose && proposeError && m('b.warning', showNetworkError(proposeError)),
    ]
  )
}
