import m from 'mithril'
import * as R from 'ramda'
import { labelStyle, showRevDecimal } from './common'

const initSelected = (st, wallet) => {
  const {account} = st

  // Pre-select first account if not selected
  const selAccount = R.isNil(account) && !R.isNil(wallet)
    ? R.head(wallet) : account

  return {...st, account: selAccount}
}

export const balanceCtrl = (st, {wallet = [], onCheckBalance}) => {
  const {account, dataBal, dataError} = initSelected(st.view({}), wallet)

  const checkBalanceEv = async _ => {
    st.update(s => ({...s, dataBal: '...', dataError: ''}))

    const [bal, dataError] = await onCheckBalance(account.revAddr)
      .catch(ex => ['', ex.message])

    const dataBal = typeof bal === 'number'
      ? bal === 0 ? `${bal}` : `${bal} (${showRevDecimal(bal)})` : ''
    st.update(s => ({...s, dataBal, dataError}))
  }

  const accountChangeEv = ev => {
    const account = wallet[ev.target.selectedIndex]
    st.set({account})
  }

  const labelAddr     = 'REV address'
  const isWalletEmpty = R.isNil(wallet) || R.isEmpty(wallet)

  return m('.ctrl',
    m('h2', 'Check REV balance'),
    isWalletEmpty
      ? m('b', 'REV wallet is empty, add accounts to check balance.')
      : m('.balance-ctrl',
          m('', 'Sends exploratory deploy to selected read-only RNode.'),
          m('', labelStyle(account), labelAddr),
          m('select', {onchange: accountChangeEv},
            wallet.map(({name, revAddr}) =>
              m('option', `${name}: ${revAddr}`)
            ),
          ),
          m(''),
          m('button', {onclick: checkBalanceEv, disabled: !account}, 'Check balance'),
          m('b', dataBal),
          m('b.warning', dataError),
        )
  )
}
