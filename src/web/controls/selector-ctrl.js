import * as R from 'ramda'
import m from 'mithril'
import { getNodeUrls } from '../../rchain-networks'
import { labelStyle } from './common'

export const selectorCtrl = (st, {nets}) => {
  const {valNode, readNode} = st.view({})
  const isTestnet = valNode.name === 'testnet'
  const isMainnet = valNode.name === 'mainnet'

  const findValidatorByIndex = index =>
    nets.flatMap(({hosts}) => hosts)[index]

  const findReadOnlyByIndex = (index, netName) =>
    nets.filter(x => x.name === netName).flatMap(({readOnlys}) => readOnlys)[index]

  const onSelIdx = ev => {
    const sel  = findValidatorByIndex(ev.target.selectedIndex)
    const read = sel.name === valNode.name ? readNode : findReadOnlyByIndex(0, sel.name)
    st.set({valNode: sel, readNode: read})
  }

  const onSelReadIdx = ev => {
    const sel = findReadOnlyByIndex(ev.target.selectedIndex, valNode.name)
    st.set({valNode, readNode: sel})
  }

  const valUrls  = getNodeUrls(valNode)
  const readUrls = getNodeUrls(readNode)

  const getDdlText = ({domain, grpc, https, http}) => {
    const grpcInfo = !!grpc ? ` gRPC:${grpc}` : ' '
    const httpInfo = !!https ? ` https:${https}` : !!http ? ` http:${http}` : ' '
    return `${domain}${grpcInfo}${httpInfo}`
  }

  const isEqNode = (v1, v2) =>
    R.eqBy(({domain, gprc, https, http}) => ({domain, gprc, https, http}), v1, v2)

  const httpMixedContentInfo = [
    m('b.warning', `* For http access allow mixed content in the browser`),
    m('a', {href: 'https://stackoverflow.com/a/24434461', target: '_blank'}, ' more info'),
  ]

  return m('.ctrl.selector-ctrl',
    // Validator selector
    m('h2', 'RNode selector'),
    m('h3', `${valNode.title} - validator node`),
    m('', labelStyle(true), `* Select an IP address if the domain name does not work`),
    // TODO: temp message until all access is on SSL
    isMainnet && !!valNode.http && m('', labelStyle(true), httpMixedContentInfo),
    m('select', {onchange: onSelIdx},
      nets.map(({title, hosts}) =>
        m('optgroup', {label: title},
          hosts.map(({domain, grpc, https, http}) =>
            m('option',
              {title, selected: isEqNode(valNode, {domain, grpc, https, http})},
              `${getDdlText({domain, grpc, https, http})}`
            )
          ),
        ),
      ),
    ),
    // Validator info
    m('table',
      valUrls.grpcUrl && m('tr', m('td', 'RNode gRPC'), m('td', m('pre', valUrls.grpcUrl))),
      m('tr', m('td', 'RNode HTTP'), m('td', m('pre', valUrls.httpUrl))),
      valUrls.grpcProxyUrl && m('tr', m('td', 'HTTP proxy'), m('td', m('pre', valUrls.grpcProxyUrl))),
    ),
    'Validator RNode ',
    m('a', {target: '_blank', href: valUrls.statusUrl}, 'status'),
    isTestnet && [
      m('a', {target: '_blank', href: valUrls.logsUrl}, 'logs'),
      m('a', {target: '_blank', href: valUrls.filesUrl}, 'files'),
    ],
    isMainnet && [
      m('p.warning', 'You are connected to MAIN RChain network. Any deploy will use REAL REVs.'),
    ],

    // Read-only selector
    m('h3', `${readNode.title} - read-only node`),
    m('', labelStyle(true), `* Select an IP address if the domain name does not work`),
    // TODO: temp message until all access is on SSL
    (isTestnet || isMainnet) && !!readNode.http && m('', labelStyle(true), httpMixedContentInfo),
    m('select', {onchange: onSelReadIdx},
      nets.filter(x => x.name === valNode.name).map(({title, readOnlys}) =>
        m('optgroup', {label: title},
          readOnlys.map(({domain, grpc, https, http}) =>
            m('option',
              {title, selected: isEqNode(readNode, {domain, grpc, https, http})},
              `${getDdlText({domain, grpc, https, http})}`
            )
          ),
        ),
      ),
    ),
    // Read-only info
    m('table',
      readUrls.grpcUrl && m('tr', m('td', 'RNode gRPC'), m('td', m('pre', readUrls.grpcUrl))),
      m('tr', m('td', 'RNode HTTP'), m('td', m('pre', readUrls.httpUrl))),
    ),
    'Read-only RNode ',
    m('a', {target: '_blank', href: readUrls.statusUrl}, 'status'),
    isTestnet && [
      m('a', {target: '_blank', href: readUrls.logsUrl}, 'logs'),
      m('a', {target: '_blank', href: readUrls.filesUrl}, 'files'),
    ],
  )
}
