import * as R from 'ramda'
import m from 'mithril'
import { getNodeUrls } from '../../rchain-networks'
import { labelStyle, html } from './common'

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

  return html`
    <div class="ctrl selector-ctrl">
      <!-- Validator selector -->
      <h2>RChain Network selector</h2>
      <h3>${valNode.title} - validator node</h3>
      <select onchange=${onSelIdx}>
        ${nets.map(({title, hosts, name}) => html`
          <optgroup class="${name}-color" label=${title}>
            ${hosts.map(({name, domain, grpc, https, http}) => html`
              <option title=${title} selected=${isEqNode(valNode, {domain, grpc, https, http})}>
                ${getDdlText({name, domain, grpc, https, http})}
              </option>
            `)}
          </optgroup>
        `)}
      </select>

      <!-- Validator info -->
      <div></div>
      <span>Direct links</span>
      <a target=_blank href=${valUrls.statusUrl}>status</a>
      <a target=_blank href=${valUrls.getBlocksUrl}>blocks</a>
      ${isTestnet && html`
        <a target=_blank href=${valUrls.logsUrl}>logs</a>
        <a target=_blank href=${valUrls.filesUrl}>files</a>
      `}
      <table>
        ${valUrls.grpcUrl && html`
          <tr><td>gRPC</td><td><pre>${valUrls.grpcUrl}</pre></td></tr>
        `}
        <tr><td>HTTP</td><td><pre>${valUrls.httpUrl}</pre></td></tr>
        ${isLocal && html`
          <tr><td>Admin</td><td><pre>${valUrls.httpAdminUrl}</pre></td></tr>
        `}
      </table>
      ${isMainnet && html`
        <p class=warning>You are connected to MAIN RChain network. Any deploy will use REAL REVs.</p>
      `}

      <!-- Read-only selector -->
      <h3>${readNode.title} - read-only node</h3>
      ${(isTestnet || isMainnet) && !!readNode.http && html`
        <div ...${labelStyle(true)}>${httpMixedContentInfo}</div>
      `}
      <select onclick=${onSelReadIdx}>
        ${nets.filter(x => x.name === valNode.name).map(({title, readOnlys, name}) => html`
          <optgroup class="${name}-color" label=${title}>
            ${readOnlys.map(({name, domain, grpc, https, http}) => html`
              <option title=${title} selected=${isEqNode(valNode, {domain, grpc, https, http})}>
                ${getDdlText({name, domain, grpc, https, http})}
              </option>
            `)}
          </optgroup>
        `)}
      </select>

      <!-- Read-only info -->
      <div></div>
      <span>Direct links</span>
      <a target=_blank href=${readUrls.statusUrl}>status</a>
      <a target=_blank href=${readUrls.getBlocksUrl}>blocks</a>
      ${isTestnet && html`
        <a target=_blank href=${readUrls.logsUrl}>logs</a>
        <a target=_blank href=${readUrls.filesUrl}>files</a>
      `}
      <table>
        ${readUrls.grpcUrl && html`
          <tr><td>gRPC</td><td><pre>${readUrls.grpcUrl}</pre></td></tr>
        `}
        <tr><td>HTTP</td><td><pre>${readUrls.httpUrl}</pre></td></tr>
        ${isLocal && html`
          <tr><td>Admin</td><td><pre>${readUrls.httpAdminUrl}</pre></td></tr>
        `}
      </table>
    </div>
  `
}
