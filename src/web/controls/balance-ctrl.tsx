import * as R from 'ramda'
import { RevAccount } from '@tgrospic/rnode-http-js'
import { h, labelStyle, showRevDecimal, showNetworkError, Cell } from './common'

export interface BalanceSt {
  readonly dataBal: string
  readonly dataError: string
  readonly account: RevAccount
}

export interface BalanceActions {
  readonly wallet: RevAccount[]
  readonly onCheckBalance: (revAddress: string) => Promise<[number, string]>
}

const initSelected = (st: BalanceSt, wallet: RevAccount[]) => {
  const {account} = st

  // Pre-select first account if not selected
  const selAccount = R.isNil(account) && !R.isNil(wallet)
    ? R.head(wallet) as RevAccount : account

  return {...st, account: selAccount}
}

export const balanceCtrl = (st: Cell<BalanceSt>, {wallet = [], onCheckBalance}: BalanceActions) => {
  const checkBalanceEv = (account: RevAccount) => async () => {
    st.update(s => ({...s, dataBal: '...', dataError: ''}))

    const [bal, dataError] = await onCheckBalance(account.revAddr)
      .catch(ex => ['', ex.message])

    const dataBal = typeof bal === 'number'
      ? bal === 0 ? `${bal}` : `${bal} (${showRevDecimal(`${bal}`)} REV)` : ''
    st.update(s => ({...s, dataBal, dataError}))
  }

  const accountChangeEv = (ev: any) => {
    const account = R.find(R.propEq('revAddr', ev.target.value), wallet) as RevAccount
    st.set({account})
  }

  const labelAddr     = 'REV address'
  const isWalletEmpty = R.isNil(wallet) || R.isEmpty(wallet)

  // Control state
  const {account, dataBal, dataError} = initSelected(st.view({}), wallet)

  return <div class="ctrl balance-ctrl">
    <h2>Check REV balance</h2>
    {isWalletEmpty ? <b>REV wallet is empty, add accounts to check balance.</b> :
      <>
        <div>Sends exploratory deploy to selected read-only RNode.</div>
        {/* REV address dropdown */}
        <div {...labelStyle(!!account)}>{labelAddr}</div>
        <select onChange={accountChangeEv}>
          {wallet.map(({name, revAddr}) =>
            <option value={revAddr}>{name}: {revAddr}</option>
          )}
        </select>
        {/* Action button / results */}
        <div></div>
        <button onClick={checkBalanceEv(account)} disabled={!account}>Check balance</button>
        <b>{dataBal}</b>
        <b class="warning">{showNetworkError(dataError)}</b>
      </>
    }
  </div>
}
