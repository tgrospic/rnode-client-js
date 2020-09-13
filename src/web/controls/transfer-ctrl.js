import * as R from 'ramda'
import { labelStyle, showRevDecimal, labelRev, showNetworkError, html } from './common'
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

export const transferCtrl = (st, {wallet, onTransfer, warn}) => {
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
  const {account, toAccount, amount, status, error} = initSelected(st.view({}), wallet)

  const labelSource      = 'Source REV address'
  const labelDestination = 'Destination REV address'
  const labelAmount      = 'Amount (in revlettes x10^8)'
  const isWalletEmpty    = R.isNil(wallet) || R.isEmpty(wallet)
  const canTransfer      = account && toAccount && amount && (account || ethDetected)
  const amountPreview    = showRevDecimal(amount)

  return html`
    <div class="ctrl transfer-ctrl">
      <h2>Transfer REV tokens</h2>
      ${isWalletEmpty ? html`<b>REV wallet is empty, add accounts to make transfers.</b>` : html`
        <div>Sends transfer deploy to selected validator RNode.</div>

        <!-- Source REV address dropdown -->
        <div ...${labelStyle(account)}>${labelSource}</div>
        <select onchange=${onSelectFrom}>
          ${wallet.map(({name, revAddr}) =>
            html`<option value=${revAddr}>${name}: ${revAddr}</option>`
          )}
        </select>

        <!-- Target REV address dropdown -->
        <div ...${labelStyle(toAccount)}>${labelDestination}</div>
        <select onchange=${onSelectTo}>
          ${wallet.map(({name, revAddr}) =>
            html`<option value=${revAddr}>${name}: ${revAddr}</option>`
          )}
        </select>

        <!-- REV amount -->
        <div></div>
        <div ...${labelStyle(amount)}>${labelAmount}</div>
        <input type=number class="rev-amount"
          value=${amount} placeholder=${labelAmount} oninput=${valEv('amount')} />
        ${labelRev(amountPreview)}

        <!-- Action buttons / results -->
        <div></div>
        <button onclick=${send} disabled=${!canTransfer}>Transfer</button>
        ${status && html`<b>${status}</b>`}
        ${error && html`<b class=warning>${showNetworkError(error)}</b>`}
      `}
    </div>
  `
}
