import m from 'mithril'

const findByIndex = (nets, index) => nets.flatMap(({urls}) => urls)[index]

export const selectorCtrl = (r, {nets, sel}) => {
  const isTestnet = sel.grpc.match(/testnet.rchain-dev.tk/)
  const [_ ,domain, port] = sel.grpc.match(/([^:]+):([\d]+)/)
  const statusUrl = `http://${domain}:${2+parseInt(port)}/status`
  const logsUrl   = `http://${domain}:8181/logs/name:rnode`
  const filesUrl  = `http://${domain}:18080`

  const onSelIdx = ev => {
    const sel = findByIndex(nets, ev.target.selectedIndex)
    r(sel)
  }

  return m('.selector-ctrl',
    m('select', {onchange: onSelIdx},
      nets.map(({label, urls}) =>
        m('optgroup', {label},
          urls.map(({grpc, http}) =>
            m('option', {title: http, selected: sel && sel.grpc === grpc}, grpc)
          ),
        ),
      ),
    ),
    m('table',
      m('tr', m('td', 'RNode gRPC'), m('td', m('pre', sel.grpc))),
      m('tr', m('td', 'HTTP proxy'), m('td', m('pre', sel.http))),
    ),
    'RNode ',
    m('a', {target: '_blank', href: statusUrl}, 'status'),
    isTestnet && [
      m('a', {target: '_blank', href: logsUrl}, 'logs'),
      m('a', {target: '_blank', href: filesUrl}, 'files'),
    ]
  )
}
