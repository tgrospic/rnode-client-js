import m from 'mithril'
import { transferFunds_rho } from '../../rho/transfer-funds'

export const transferCtrl = (r, st) => {
  const {fromAddr , toAddr, amount, privateKey, onTransfer, status} = st

  const valEv = name => ev => {
    const val = ev.target.value
    r({...st, [name]: val})
  }

  const send = async _ => {
    r({...st, status: '...'})
    const code = transferFunds_rho(fromAddr, toAddr, amount)
    await onTransfer(code, privateKey)
    r({...st, status: '✓'})
  }

  const canTransfer = fromAddr && toAddr && amount && privateKey

  return m('.transfer-ctrl',
    m('input[type=text]', {placeholder: 'From REV address', oninput: valEv('fromAddr')}),
    m(''),
    m('input[type=text]', {placeholder: 'To REV address', oninput: valEv('toAddr')}),
    m(''),
    m('input[type=text]', {placeholder: 'Amount', oninput: valEv('amount'), style: {width: '100px'}}),
    m(''),
    m('input[type=text]', {placeholder: 'Private key of From REV address', oninput: valEv('privateKey')}),
    m(''),
    m('button', {onclick: send, disabled: !canTransfer}, 'Transfer'),
    m('b', status),
  )
}
