import * as R from 'ramda'
import m from 'mithril'
import {
  getAddrFromPrivateKey, getAddrFromPublicKey, getAddrFromEth,
  newRevAddr, verifyRevAddr,
} from '@tgrospic/rnode-grpc-js'
import { labelStyle } from './common'
import { ethereumAddress, ethDetected } from '../../eth/eth-wrapper'

export const addressCtrl = (st, {wallet, onAddAccount}) => {
  const {text, privKey, pubKey, ethAddr, revAddr, name} = st.view({})
  const updateAddress = text => {
    const val = text.replace(/^0x/, '').trim()
    // Account from private key, public key, ETH or REV address
    const fromPriv = getAddrFromPrivateKey(val)
    const fromPub  = getAddrFromPublicKey(val)
    const fromEth  = getAddrFromEth(val)
    const isRev    = verifyRevAddr(val)
    // Render
    if (isRev) {
      st.set({text, revAddr: text})
    } else if (!!fromPriv) {
      st.set({text, privKey: val, ...fromPriv})
    } else if (!!fromPub) {
      st.set({text, pubKey: val, ...fromPub})
    } else if (!!fromEth) {
      st.set({text, privKey: '', pubKey: '', ethAddr: val, revAddr: fromEth})
    } else
      st.set({text})
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
    const {privKey} = newRevAddr()
    updateAddress(privKey)
  }

  const updateEv = revAddr => _ => {
    const acc = wallet.find(R.propEq('revAddr', revAddr))
    st.set(acc)
  }

  const labelSource = 'REV address / ETH address / Public key / Private key'
  const addDisabled = !name || !name.trim()

  return m('.ctrl.address-ctrl',
    m('h2', 'REV wallet (import REV address, ETH address, public/private key, Metamask)'),
    m('', labelStyle(text), labelSource),
    m('input[type=text]', {
      autocomplete: 'nono', placeholder: labelSource,
      value: text, oninput: addrKeyPressEv
    }),
    ethDetected && m('button', {onclick: fillMetamaskAccountEv}, 'Metamask account'),
    m('button', {onclick: newRevAddrEv}, 'New account'),
    revAddr && m('.address-gen',
      m('table',
        privKey && m('tr', m('td', 'Private key'), m('td', privKey)),
        pubKey  && m('tr', m('td', 'Public key'), m('td', pubKey)),
        ethAddr && m('tr', m('td', 'ETH'), m('td', ethAddr)),
        m('tr', m('td', 'REV'), m('td', m('b', revAddr))),
      ),
      m('input[type=text].addr-name', {placeholder: 'Name', value: name, oninput: nameKeyPressEv}),
      m('button', {onclick: addAccount, disabled: addDisabled}, 'Save account'),
      m('button', {onclick: clear}, 'Clear'),
    ),
    // Wallet
    wallet && !!wallet.length && m('table.wallet',
      m('thead',
        m('th', 'Account'),
        m('th', 'REV'),
        m('th', 'ETH'),
        m('th', 'PUBLIC'),
        m('th', 'PRIVATE'),
      ),
      wallet.map(({name, privKey = '', pubKey = '', ethAddr = '', revAddr}) => {
        const rev  = revAddr.slice(0, 10)
        const eth  = ethAddr.slice(0, 10)
        const pub  = pubKey.slice(0, 10)
        const priv = privKey.slice(0, 5)
        return m('tr',
          m('td.account', {onclick: updateEv(revAddr)}, name),
          m('td', rev),
          m('td', eth),
          m('td', pub),
          m('td', priv ? '✓' : ''),
        )
      })
    ),
  )
}
