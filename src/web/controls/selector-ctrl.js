// @ts-check
import * as R from 'ramda'
import m from 'mithril'
import { getNodeUrls } from '../../rchain-networks'

export const selectorCtrl = (st, {nets}) => {
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

  const getDdlText = ({name, domain, grpc, https, http}) => {
    const httpInfo = !!https ? `:${https}` : !!http ? `:${http}` : ' '
    const isLocal  = name === 'localnet'
    return isLocal ? `${domain}${httpInfo}` : domain
  }

  const isEqNode = (v1, v2) =>
    R.eqBy(({domain, gprc, https, http}) => ({domain, gprc, https, http}), v1, v2)

  // Control state
  const {valNode, readNode} = st.view({})

  const isLocal   = valNode.name === 'localnet'
  const isTestnet = valNode.name === 'testnet'
  const isMainnet = valNode.name === 'mainnet'
  const valUrls   = getNodeUrls(valNode)
  const readUrls  = getNodeUrls(readNode)

  return m('.ctrl.selector-ctrl',
    // Validator selector
    m('h2', 'RChain Network selector'),
    m('h3', `${valNode.title} - validator node`),
    m('select', {onchange: onSelIdx},
      nets.map(({title, hosts, name}) =>
        m(`optgroup.${name}-color`, {label: title},
          hosts.map(({name, domain, grpc, https, http}) =>
            m(`option`,
              {title, selected: isEqNode(valNode, {domain, grpc, https, http})},
              getDdlText({name, domain, grpc, https, http})
            )
          ),
        ),
      ),
    ),

    // Validator info
    m(''),
    m('span', 'Direct links'),
    m('a', {target: '_blank', href: valUrls.statusUrl}, 'status'),
    m('a', {target: '_blank', href: valUrls.getBlocksUrl}, 'blocks'),
    isTestnet && [
      valUrls.logsUrl  && m('a', {target: '_blank', href: valUrls.logsUrl}, 'logs'),
      valUrls.filesUrl && m('a', {target: '_blank', href: valUrls.filesUrl}, 'files'),
    ],
    m('table',
      valUrls.grpcUrl && m('tr', m('td', 'gRPC'), m('td', m('pre', valUrls.grpcUrl))),
      m('tr', m('td', 'HTTP'), m('td', m('pre', valUrls.httpUrl))),
      isLocal && m('tr', m('td', 'Admin'), m('td', m('pre', valUrls.httpAdminUrl))),
    ),
    isMainnet && [
      m('p.warning', 'You are connected to MAIN RChain network. Any deploy will use REAL REVs.'),
    ],

    // Read-only selector
    m('h3', `${readNode.title} - read-only node`),
    m('select', {onchange: onSelReadIdx},
      nets.filter(x => x.name === valNode.name).map(({title, readOnlys}) =>
        m('optgroup', {label: title},
          readOnlys.map(({name, domain, grpc, https, http}) =>
            m('option',
              {title, selected: isEqNode(readNode, {domain, grpc, https, http})},
              getDdlText({name, domain, grpc, https, http})
            )
          ),
        ),
      ),
    ),

    // Read-only info
    m(''),
    m('span', 'Direct links'),
    m('a', {target: '_blank', href: readUrls.statusUrl}, 'status'),
    m('a', {target: '_blank', href: readUrls.getBlocksUrl}, 'blocks'),
    isTestnet && [
      readUrls.logsUrl  && m('a', {target: '_blank', href: readUrls.logsUrl}, 'logs'),
      readUrls.filesUrl && m('a', {target: '_blank', href: readUrls.filesUrl}, 'files'),
    ],
    m('table',
      readUrls.grpcUrl && m('tr', m('td', 'gRPC'), m('td', m('pre', readUrls.grpcUrl))),
      m('tr', m('td', 'HTTP'), m('td', m('pre', readUrls.httpUrl))),
      isLocal && m('tr', m('td', 'Admin'), m('td', m('pre', readUrls.httpAdminUrl))),
    ),
  )
}
