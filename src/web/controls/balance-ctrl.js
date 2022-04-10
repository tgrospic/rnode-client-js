// @ts-check
import m from 'mithril'
import * as R from 'ramda'
import { labelStyle, showTokenDecimal, showNetworkError } from './common'

const initSelected = (st, wallet) => {
  const {account} = st

  // Pre-select first account if not selected
  const selAccount = R.isNil(account) && !R.isNil(wallet)
    ? R.head(wallet) : account

  return {...st, account: selAccount}
}

export const balanceCtrl = (st, {wallet = [], node, onCheckBalance}) => {
  const {tokenName, tokenDecimal} = node

  const checkBalanceEv = async _ => {
    st.update(s => ({...s, dataBal: '...', dataError: ''}))

    const [bal, dataError] = await onCheckBalance(account.revAddr)
      .catch(ex => ['', ex.message])

    const dataBal = typeof bal === 'number'
      ? bal === 0 ? `${bal}` : `${bal} (${showTokenDecimal(bal, tokenDecimal)} ${tokenName})` : ''
    st.update(s => ({...s, dataBal, dataError}))
  }

  const accountChangeEv = ev => {
    const account = R.find(R.propEq('revAddr', ev.target.value), wallet)
    st.set({account})
  }

  const labelAddr     = `${tokenName} address`
  const isWalletEmpty = R.isNil(wallet) || R.isEmpty(wallet)

  // Control state
  const {account, dataBal, dataError} = initSelected(st.view({}), wallet)

  return m('.ctrl.balance-ctrl',
    m('h2', `Check ${tokenName} balance`),
    isWalletEmpty ? m('b', `${tokenName} wallet is empty, add accounts to check balance.`) : [
      m('', 'Sends exploratory deploy to selected read-only RNode.'),

      // REV address dropdown
      m('', labelStyle(account), labelAddr),
      m('select', {onchange: accountChangeEv},
        wallet.map(({name, revAddr}) =>
          m('option', {value: revAddr}, `${name}: ${revAddr}`)
        ),
      ),

      // Action button / results
      m(''),
      m('button', {onclick: checkBalanceEv, disabled: !account}, 'Check balance'),
      m('b', dataBal),
      m('b.warning',  showNetworkError(dataError)),
    ]
  )
}
