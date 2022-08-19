// @ts-check
import m from 'mithril'
import * as R from 'ramda'
import { labelStyle, showTokenDecimal, labelRev, showNetworkError } from './common'
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

export const transferCtrl = (st, {wallet, node, onTransfer, warn}) => {
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
        warn('Transfer error', ex)
      })
  }

  const onSelectFrom = async ev => {
    const account = R.find(R.propEq('revAddr', ev.target.value), wallet)
    st.update(s => ({...s, account}))
  }

  const onSelectTo = async ev => {
    const toAccount = R.find(R.propEq('revAddr', ev.target.value), wallet)
    st.update(s => ({...s, toAccount}))
  }

  // Control state
  const {account, toAccount, amount, status, error, fetching} = initSelected(st.view({}), wallet)

  const {tokenName, tokenDecimal} = node
  const labelSource      = `Source ${tokenName} address`
  const labelDestination = `Destination ${tokenName} address`
  const labelAmount      = `Amount (in tiny ${tokenName} x10^${tokenDecimal})`
  const isWalletEmpty    = R.isNil(wallet) || R.isEmpty(wallet)
  const canTransfer      = account && toAccount && amount && (account || ethDetected) && !fetching
  const amountPreview    = showTokenDecimal(amount, tokenDecimal)

  return m('.ctrl.transfer-ctrl',
    m('h2', `Transfer ${tokenName} tokens`),
    isWalletEmpty ? m('b', `${tokenName} wallet is empty, add accounts to make transfers.`) : [
      m('', 'Sends transfer deploy to selected validator RNode.'),

      // Source REV address dropdown
      m('', labelStyle(account), labelSource),
      m('select', {onchange: onSelectFrom},
        wallet.map(({name, revAddr}) =>
          m('option', {value: revAddr}, `${name}: ${revAddr}`)
        ),
      ),

      // Target REV address dropdown
      m(''),
      m('', labelStyle(toAccount), labelDestination),
      m('select', {onchange: onSelectTo},
        wallet.map(({name, revAddr}) =>
          m('option', {value: revAddr}, `${name}: ${revAddr}`)
        ),
      ),

      // REV amount
      m(''),
      m('', labelStyle(amount), labelAmount),
      m('input[type=number].rev-amount', {
        placeholder: labelAmount, value: amount,
        oninput: valEv('amount'),
      }),
      labelRev(amountPreview, tokenName),

      // Action button / result
      m(''),
      m('button', {onclick: send, disabled: !canTransfer}, 'Transfer'),
      status && m('b', status),
      error && m('b.warning', showNetworkError(error)),
    ]
  )
}
