import * as R from 'ramda'
import { ethDetected } from '@tgrospic/rnode-http-js'
import { RevAccount } from '@tgrospic/rnode-http-js'
import { h, labelStyle, showRevDecimal, labelRev, showNetworkError, Cell, blockEventKey } from './common'

export interface TransferSt {
  readonly account: RevAccount
  readonly toAccount: RevAccount
  readonly amount: string

  readonly status: string
  readonly error: string
}

export type TransferData = {
  fromAccount: RevAccount,
  toAccount: RevAccount,
  amount: string
}

export interface TransferActions {
  readonly wallet: RevAccount[]
  readonly warn: typeof console.warn
  readonly onTransfer: (t: {
    fromAccount: RevAccount,
    toAccount: RevAccount,
    amount: string
  }) => Promise<string>
}

const initSelected = (st: TransferSt, wallet: RevAccount[]) => {
  const {account, toAccount} = st

  // Pre-select first account if not selected

  const selAccount = R.isNil(account) && !R.isNil(wallet)
    ? R.head(wallet) as RevAccount : account

  const selToAccount = R.isNil(toAccount) && !R.isNil(wallet)
    ? R.head(wallet) as RevAccount : toAccount

  return {...st, account: selAccount, toAccount: selToAccount}
}

export const transferCtrl = (st: Cell<TransferSt>, {wallet, onTransfer, warn}: TransferActions) => {
  const valEv = (name: keyof TransferSt) => (ev: Event) => {
    const val = (ev.target as HTMLInputElement).value
    st.update(s => ({...s, [name]: val}))
    // st.o(name).set(val)
  }

  const send = (account: RevAccount, toAccount: RevAccount, amount: string) => async () => {
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

  const onSelectFrom = async (ev: any) => {
    const account = R.find(R.propEq('revAddr', ev.target.value), wallet) as RevAccount
    st.update(s => ({...s, account}))
  }

  const onSelectTo = async (ev: any) => {
    const toAccount = R.find(R.propEq('revAddr', ev.target.value), wallet) as RevAccount
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

  return <div class="ctrl transfer-ctrl">
    <h2>Transfer REV tokens</h2>
    {isWalletEmpty ? <b>REV wallet is empty, add accounts to make transfers.</b> : <>
      <div>Sends transfer deploy to selected validator RNode.</div>

      {/* Source REV address dropdown */}
      <div {...labelStyle(!!account)}>{labelSource}</div>
      <select onChange={onSelectFrom}>
        {wallet.map(({name, revAddr}) =>
          <option value={revAddr}>{name}: {revAddr}</option>
        )}
      </select>

      {/* Target REV address dropdown */}
      <div {...labelStyle(!!toAccount)}>{labelDestination}</div>
      <select onChange={onSelectTo}>
        {wallet.map(({name, revAddr}) =>
          <option value={revAddr}>{name}: {revAddr}</option>
        )}
      </select>

      {/* REV amount */}
      <div></div>
      <div {...labelStyle(!!amount)}>{labelAmount}</div>
      <input type="number" class="rev-amount"
        value={amount} placeholder={labelAmount}
        onInput={valEv('amount')}
        onKeyDown={blockEventKey(/^[a-zA-Z]$/)}
      />
      {labelRev(amountPreview)}

      {/* Action buttons / results */}
      <div></div>
      <button onClick={send(account, toAccount, amount)} disabled={!canTransfer}>Transfer</button>
      {status && <b>{status}</b>}
      {error && <b class="warning">{showNetworkError(error)}</b>}
    </>}
  </div>
}
