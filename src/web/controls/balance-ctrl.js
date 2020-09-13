import * as R from 'ramda'
import { labelStyle, showRevDecimal, showNetworkError, html } from './common'

const initSelected = (st, wallet) => {
  const {account} = st

  // Pre-select first account if not selected
  const selAccount = R.isNil(account) && !R.isNil(wallet)
    ? R.head(wallet) : account

  return {...st, account: selAccount}
}

export const balanceCtrl = (st, {wallet = [], onCheckBalance}) => {
  const checkBalanceEv = async _ => {
    st.update(s => ({...s, dataBal: '...', dataError: ''}))

    const [bal, dataError] = await onCheckBalance(account.revAddr)
      .catch(ex => ['', ex.message])

    const dataBal = typeof bal === 'number'
      ? bal === 0 ? `${bal}` : `${bal} (${showRevDecimal(bal)} REV)` : ''
    st.update(s => ({...s, dataBal, dataError}))
  }

  const accountChangeEv = ev => {
    const account = R.find(R.propEq('revAddr', ev.target.value), wallet)
    st.set({account})
  }

  const labelAddr     = 'REV address'
  const isWalletEmpty = R.isNil(wallet) || R.isEmpty(wallet)

  // Control state
  const {account, dataBal, dataError} = initSelected(st.view({}), wallet)

  return html`
    <div class="ctrl balance-ctrl">
      <h2>Check REV balance</h2>
      ${isWalletEmpty ? html`<b>REV wallet is empty, add accounts to check balance.</b>` : html`
        <div>Sends exploratory deploy to selected read-only RNode.</div>

        <!-- REV address dropdown -->
        <div ...${labelStyle(account)}>${labelAddr}</div>
        <select onchange=${accountChangeEv}>
          ${wallet.map(({name, revAddr}) =>
            html`<option value=${revAddr}>${name}: ${revAddr}</option>`
          )}
        </select>

        <!-- Action button / results -->
        <div></div>
        <button onclick=${checkBalanceEv} disabled=${!account}>Check balance</button>
        <b>${dataBal}</b>
        <b class=warning>${showNetworkError(dataError)}</b>
      `}
    </div>
  `
}
