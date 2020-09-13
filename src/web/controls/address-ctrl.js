import * as R from 'ramda'
import { newRevAccount, createRevAccount } from '../../rev-address'
import { labelStyle, html } from './common'
import { ethereumAddress, ethDetected } from '../../eth/eth-wrapper'

export const addressCtrl = (st, {wallet, onAddAccount}) => {
  const updateAddress = text => {
    // Account from private key, public key, ETH or REV address
    const revAccount = createRevAccount(text) || {}

    // Update state and display
    st.set({text, ...revAccount})
  }

  const addAccount = async _ => {
    const account = {name, privKey, pubKey, ethAddr, revAddr}
    await onAddAccount(account)
    clear()
  }

  const clear = _ => {
    st.set({text: ''})
  }

  const fillMetamaskAccountEv = async _ => {
    const ethAddr = await ethereumAddress()
    updateAddress(ethAddr)
  }

  const addrKeyPressEv = ev => {
    const text = ev.target.value
    updateAddress(text)
  }

  const nameKeyPressEv = ev => {
    const nameVal = ev.target.value
    st.update(s => ({...s, name: nameVal}))
  }

  const newRevAddrEv = _ => {
    const {privKey} = newRevAccount()
    updateAddress(privKey)
  }

  const updateEv = revAddr => _ => {
    const acc = wallet.find(R.propEq('revAddr', revAddr))
    st.set(acc)
  }

  // Control state
  const {text, privKey, pubKey, ethAddr, revAddr, name} = st.view({})

  const description = html`
    <span class=info>
      Any address used on this page must be first added as an account and assign a name. All accounts are then shown in dropdown menus to select as send or receive address.
      <br/>
      Entered information is not stored anywhere except on the page. After exit or refresh the page, all information is lost.
    </span>
  `
  const labelSource     = 'REV address / ETH address / Public key / Private key'
  const metamaskTitle   = 'Copy ETH address from selected Metamask account'
  const newAccountTitle = 'Generate new private key (public key, ETH, REV)'
  const saveTitle       = 'Save account with assigned name'
  const closeTitle      = 'Cancel edit of account'
  const namePlaceholder = 'Friendly name for account'
  const addDisabled     = !name || !name.trim()
  const isEdit          = !!revAddr

  return html`
    <div class="ctrl address-ctrl">
      <h2>REV wallet (import REV address, ETH address, public/private key, Metamask)</h2>
      ${description}

      <!-- Input textbox -->
      <div ...${labelStyle(text)}>${labelSource}</div>
      <input type=text autocomplete=nono placeholder=${labelSource} value=${text} oninput=${addrKeyPressEv} />

      <!-- New accounts -->
      ${ethDetected && html`
        <button title=${metamaskTitle} disabled=${isEdit} onclick=${fillMetamaskAccountEv}>Metamask account</button>
      `}
      <button title=${newAccountTitle} disabled=${isEdit} onclick=${newRevAddrEv}>New account</button>

      <!-- Edit wallet item -->
      ${isEdit && html`
        <div class="address-gen">
          <table>
            ${privKey && html`<tr><td>Private key</td><td>${privKey}</td></tr>`}
            ${pubKey && html`<tr><td>Public key</td><td>${pubKey}</td></tr>`}
            ${ethAddr && html`<tr><td>ETH</td><td>${ethAddr}</td></tr>`}
            <tr><td>REV</td><td><b>${revAddr}</b></td></tr>
          </table>
          <!-- Action buttons -->
          <input type=text class="addr-name" placeholder=${namePlaceholder} value=${name} oninput=${nameKeyPressEv} />
          <button class="add-account" title=${saveTitle} onclick=${addAccount} disabled=${addDisabled}>Save account</button>
          <button title=${closeTitle} onclick=${clear}>Close</button>
        </div>
      `}

      <!-- Wallet display -->
      ${wallet && !!wallet.length && html`
        <table class=wallet>
          <thead>
            <tr><th>Account</th><th>REV</th><th>ETH</th><th>PUBLIC</th><th>PRIVATE</th></tr>
          </thead>
          ${wallet.map(({name, privKey = '', pubKey = '', ethAddr = '', revAddr}) => {
            const rev  = revAddr.slice(0, 10)
            const eth  = ethAddr.slice(0, 10)
            const pub  = pubKey.slice(0, 10)
            const priv = privKey.slice(0, 5)
            return html`
              <tr>
                <td class=account onclick=${updateEv(revAddr)}>${name}</td>
                <td>${rev}</td>
                <td>${eth}</td>
                <td>${pub}</td>
                <td>${priv ? html`<span title='Private key saved with this account'>✓</span>` : ''}</td>
              </tr>
            `
          })}
        </table>
      `}
    </div>
  `
}
