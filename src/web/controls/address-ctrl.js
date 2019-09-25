import m from 'mithril'
import { getAddrFromPublicKey, getAddrFromEth } from '../../rnode-address'

export const addressCtrl = (r, {pubKey, ethAddr, revAddr}) => {
  const keyPress = ev => {
    const txt = ev.target.value
    const revFromEth = getAddrFromEth(txt) || getAddrFromEth(txt.replace(/^0x/, ''))
    if (revFromEth) {
      r({pubKey: txt, ethAddr: txt, revAddr: revFromEth})
    } else {
      const addr = getAddrFromEth(txt) || getAddrFromPublicKey(txt) || {}
      r({pubKey: txt, ...addr})
    }
  }

  return m('.address-ctrl',
    m('input[type=text]', {placeholder: 'Public key / ETH address', oninput: keyPress}),
    revAddr && m('.address-gen',
      m('table',
        m('tr', m('td', '>'), m('td', pubKey)),
        m('tr', m('td', 'ETH'), m('td', ethAddr)),
        m('tr', m('td', 'REV'), m('td', m('b', revAddr))),
      ),
    ),
  )
}
