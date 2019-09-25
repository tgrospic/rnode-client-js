import m from 'mithril'

import { checkBalance_rho } from '../../rho/check-balance'

export const balanceCtrl = (r, st) => {
  const {onCheckBalance, onGetData, addr, deployId, dataBal, dataGet} = st

  const valEv = name => ev => {
    const val = ev.target.value
    r({...st, [name]: val})
  }

  const checkBalaneEv = _ => {
    r({...st, dataBal: '...'})
    const deployCode = checkBalance_rho(addr)
    onCheckBalance(deployCode)
  }

  const getDataEv = _ => {
    r({...st, dataGet: '...'})
    onGetData(deployId)
  }

  return m('.balance-ctrl',
    m('', 'Check logs at the bottom and browser console to see deploy details.'),
    m('input[type=text]', {placeholder: 'REV address', oninput: valEv('addr')}),
    m(''),
    m('button', {onclick: checkBalaneEv, disabled: !addr}, 'Check balance'),
    m('b', dataBal),
    // Get data by deployId
    m(''),
    m('', 'Get data by deployId (this doesn\'t create a new deploy).'),
    m('input[type=text]', {placeholder: 'Deploy Id', oninput: valEv('deployId')}),
    m(''),
    m('button', {onclick: getDataEv, disabled: !deployId}, 'Get data'),
    m('b', dataGet),
  )
}
