import m from 'mithril'
import * as R from 'ramda'
import { labelStyle, showRevDecimal } from './common'
import { ethDetected } from '../../eth/eth-wrapper'

const initSelected = (st, wallet) => {
  const {account, toAccount} = st

  // Pre-select first account if not selected

  const selAccount = R.isNil(account) && !R.isNil(wallet)
    ? R.head(wallet) : account

  const selToAccount = R.isNil(toAccount) && !R.isNil(wallet)
    ? R.head(wallet) : toAccount

  return {...st, account: selAccount, toAccount: selToAccount}
}

export const transferCtrl = (st, {wallet, onTransfer}) => {
  const {
    account, toAccount, amount, status, error
  } = initSelected(st.view({}), wallet)

  const valEv = name => ev => {
    const val = ev.target.value
    st.update(s => ({...s, [name]: val}))
  }

  const send = async _ => {
    st.update(s => ({...s, status: '...', error: ''}))
    await onTransfer({fromAccount: account, toAccount, amount})
      .then(x => {
        st.update(s => ({...s, status: x, error: ''}))
      })
      .catch(ex => {
        st.update(s => ({...s, status: '', error: ex.message}))
        console.warn('Transfer error', ex)
      })
  }

  const onSelectFrom = async ev => {
    const account = wallet[ev.target.selectedIndex]
    st.update(s => ({...s, account}))
  }

  const onSelectTo = async ev => {
    const toAccount = wallet[ev.target.selectedIndex]
    st.update(s => ({...s, toAccount}))
  }

  const labelSource      = 'Source REV address'
  const labelDestination = 'Destination REV address'
  const labelAmount      = 'Amount'
  const isWalletEmpty    = R.isNil(wallet) || R.isEmpty(wallet)
  const canTransfer      = account && toAccount && amount && (account || ethDetected)
  const amountPreview    = showRevDecimal(amount)

  return m('.ctrl',
    m('h2', 'Transfer REV tokens'),
    isWalletEmpty
      ? m('b', 'REV wallet is empty, add accounts to make transfers.')
      : m('.transfer-ctrl',
          m('', 'Sends deploy to selected validator RNode.'),
          m('', labelStyle(account), labelSource),
          m('select', {onchange: onSelectFrom},
            wallet.map(({name, revAddr}) =>
              m('option', `${name}: ${revAddr}`)
            ),
          ),
          m(''),
          m('', labelStyle(toAccount), labelDestination),
          m('select', {onchange: onSelectTo},
            wallet.map(({name, revAddr}) =>
              m('option', `${name}: ${revAddr}`)
            ),
          ),
          m(''),
          m('', labelStyle(amount), labelAmount),
          m('input[type=number]', {
            placeholder: labelAmount, value: amount,
            oninput: valEv('amount'), style: {width: '120px'}
          }),
          m('span', amountPreview),
          m(''),
          m('button', {onclick: send, disabled: !canTransfer}, 'Transfer'),
          status && m('b', status),
          error && m('b.warning', error),
        )
  )
}
