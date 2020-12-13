import * as R from 'ramda'
import { newRevAccount, createRevAccount, RevAccount } from '@tgrospic/rnode-http-js'
import { ethereumAddress, ethDetected } from '@tgrospic/rnode-http-js'
import { h, labelStyle, Cell } from './common'

export interface AddressSt extends RevAccount {
  text: string
}

export interface AddressActions {
  readonly wallet: RevAccount[]
  readonly onAddAccount: (acc: RevAccount) => void
}

export const addressCtrl = (st: Cell<AddressSt>, {wallet, onAddAccount}: AddressActions) => {
  const updateAddress = (text: string) => {
    // Account from private key, public key, ETH or REV address
    const revAccount = createRevAccount(text) || {}

    // Update state and display
    st.set({text, ...revAccount})
  }

  const addAccount = () => {
    const account = {name, privKey, pubKey, ethAddr, revAddr}
    onAddAccount(account)
    clear()
  }

  const clear = () => {
    st.set({text: ''})
  }

  const fillMetamaskAccountEv = async () => {
    const ethAddr = await ethereumAddress()
    updateAddress(ethAddr)
  }

  const addrKeyPressEv = (ev: any) => {
    const text = ev.target.value
    updateAddress(text)
  }

  const nameKeyPressEv = (ev: any) => {
    const nameVal = ev.target.value
    st.update(s => ({...s, name: nameVal}))
  }

  const newRevAddrEv = () => {
    const {privKey} = newRevAccount()
    updateAddress(privKey as string)
  }

  const updateEv = (revAddr: string) => () => {
    const acc = wallet.find(R.propEq('revAddr', revAddr)) as RevAccount
    st.set(acc)
  }

  // Control state
  const {text, privKey, pubKey, ethAddr, revAddr, name} = st.view({})

  const description =
    <span class="info">
      Any address used on this page must be first added as an account and assign a name. All accounts are then shown in dropdown menus to select as send or receive address.
      <br/>
      Entered information is not stored anywhere except on the page. After exit or refresh the page, all information is lost.
    </span>

  const labelSource     = 'REV address / ETH address / Public key / Private key'
  const metamaskTitle   = 'Copy ETH address from selected Metamask account'
  const newAccountTitle = 'Generate new private key (public key, ETH, REV)'
  const saveTitle       = 'Save account with assigned name'
  const closeTitle      = 'Cancel edit of account'
  const namePlaceholder = 'Friendly name for account'
  const addDisabled     = !name || !name.trim()
  const isEdit          = !!revAddr

  return <div class="ctrl address-ctrl">
    <h2>REV wallet (import REV address, ETH address, public/private key, Metamask)</h2>
    {description}

    {/* Input textbox */}
    <div {...labelStyle(!!text)}>{labelSource}</div>
    <input type="text" autocomplete="nono" placeholder={labelSource} value={text} onInput={addrKeyPressEv} />

    {/* New accounts */}
    {ethDetected &&
      <button title={metamaskTitle} disabled={isEdit} onClick={fillMetamaskAccountEv}>Metamask account</button>
    }
    <button title={newAccountTitle} disabled={isEdit} onClick={newRevAddrEv}>New account</button>

    {/* Edit wallet item */}
    {isEdit &&
      <div class="address-gen">
        <table>
          {privKey && <tr><td>Private key</td><td>{privKey}</td></tr>}
          {pubKey  && <tr><td>Public key</td> <td>{pubKey}</td></tr>}
          {ethAddr && <tr><td>ETH</td>        <td>{ethAddr}</td></tr>}
                      <tr><td>REV</td>        <td><b>{revAddr}</b></td></tr>
        </table>
        {/* Action buttons */}
        <input type="text" class="addr-name" placeholder={namePlaceholder} value={name} onInput={nameKeyPressEv} />
        <button class="add-account" title={saveTitle} onClick={addAccount} disabled={addDisabled}>Save account</button>
        <button title={closeTitle} onClick={clear}>Close</button>
      </div>
    }

    {/* Wallet display */}
    {wallet && !!wallet.length &&
      <table class="wallet">
        <thead>
          <tr><th>Account</th><th>REV</th><th>ETH</th><th>PUBLIC</th><th>PRIVATE</th></tr>
        </thead>
        {wallet.map(({name, privKey = '', pubKey = '', ethAddr = '', revAddr}) => {
          const rev  = revAddr.slice(0, 10)
          const eth  = ethAddr.slice(0, 10)
          const pub  = pubKey.slice(0, 10)
          const priv = privKey.slice(0, 5)
          return <tr>
              <td class="account" onClick={updateEv(revAddr)}>{name}</td>
              <td>{rev}</td>
              <td>{eth}</td>
              <td>{pub}</td>
              <td>{priv ? <span title="Private key saved with this account">✓</span> : ''}</td>
            </tr>
        })}
      </table>
    }
  </div>
}
