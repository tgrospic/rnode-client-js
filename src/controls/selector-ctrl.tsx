import * as R from 'ramda'
import { getNodeUrls, NetworkName, RChainNetwork, RNodeInfo } from '../rchain-networks'
import { h, Cell } from './common'

export interface SelectorSt {
  readonly valNode: RNodeInfo
  readonly readNode: RNodeInfo
}

export interface SelectorActions {
  readonly nets: RChainNetwork[]
}

export const selectorCtrl = (st: Cell<SelectorSt>, {nets}: SelectorActions) => {
  const findValidatorByIndex = (index: number) =>
    R.chain(({hosts}) => hosts, nets)[index]

  const findReadOnlyByIndex = (index: number, netName?: NetworkName) => R.pipe(
    (xs: RChainNetwork[]) => R.filter<RChainNetwork>(x => x.name === netName, xs),
    R.chain(({readOnlys}) => readOnlys)
  )(nets)[index]

  const onSelIdx = (ev: any) => {
    const sel  = findValidatorByIndex(ev.target.selectedIndex)
    const read = sel.name === valNode.name ? readNode : findReadOnlyByIndex(0, sel.name)
    st.set({valNode: sel, readNode: read})
  }

  const onSelReadIdx = (ev: any) => {
    const sel = findReadOnlyByIndex(ev.target.selectedIndex, valNode.name)
    st.set({valNode, readNode: sel})
  }

  const getDdlText = ({name, domain, grpc, https, http}: RNodeInfo) => {
    const httpInfo = !!https ? `:${https}` : !!http ? `:${http}` : ' '
    const isLocal  = name === 'localnet'
    return isLocal ? `${domain}${httpInfo}` : domain
  }

  const isEqNode = (v1: any, v2: any) =>
    R.eqBy(({domain, gprc, https, http}) => ({domain, gprc, https, http}), v1, v2)

  // Control state
  const {valNode, readNode} = st.view({})

  const isLocal   = valNode.name === 'localnet'
  const isTestnet = valNode.name === 'testnet'
  const isMainnet = valNode.name === 'mainnet'
  const valUrls   = getNodeUrls(valNode)
  const readUrls  = getNodeUrls(readNode)

  return <div class="ctrl selector-ctrl">
    {/* Validator selector */}
    <h2>RChain Network selector</h2>
    <h3>{valNode.title} - validator node</h3>
    <select onInput={onSelIdx}>
      {nets.map(({title, hosts, name}) =>
        <optgroup class={`${name}-color`} label={title}>
          {hosts.map(({name, domain, grpc, https, http}) =>
            <option title={title} selected={isEqNode(valNode, {domain, grpc, https, http})}>
              {getDdlText({name, domain, grpc, https, http})}
            </option>
          )}
        </optgroup>
      )}
    </select>

    {/* Validator info */}
    <div></div>
    <span>Direct links</span>
    <a target="_blank" href={valUrls.statusUrl}>status</a>
    <a target="_blank" href={valUrls.getBlocksUrl}>blocks</a>
    {isTestnet && <>
      <a target="_blank" href={valUrls.logsUrl}>logs</a>
      <a target="_blank" href={valUrls.filesUrl}>files</a>
    </>}
    <table>
      {valUrls.grpcUrl && <tr><td>gRPC</td> <td><pre>{valUrls.grpcUrl}</pre></td></tr>}
                          <tr><td>HTTP</td> <td><pre>{valUrls.httpUrl}</pre></td></tr>
      {isLocal &&         <tr><td>Admin</td><td><pre>{valUrls.httpAdminUrl}</pre></td></tr>}
    </table>
    {isMainnet && <p class="warning">You are connected to MAIN RChain network. Any deploy will use REAL REVs.</p>}

    {/* Read-only selector */}
    <h3>{readNode.title} - read-only node</h3>
    <select onInput={onSelReadIdx}>
      {nets.filter(x => x.name === valNode.name).map(({title, readOnlys, name}) =>
        <optgroup class={`${name}-color`} label={title}>
          {readOnlys.map(({name, domain, grpc, https, http}) =>
            <option title={title} selected={isEqNode(readNode, {domain, grpc, https, http})}>
              {getDdlText({name, domain, grpc, https, http})}
            </option>
          )}
        </optgroup>
      )}
    </select>

    {/* Read-only info */}
    <div></div>
    <span>Direct links</span>
    <a target="_blank" href={readUrls.statusUrl}>status</a>
    <a target="_blank" href={readUrls.getBlocksUrl}>blocks</a>
    {isTestnet && <>
      <a target="_blank" href={readUrls.logsUrl}>logs</a>
      <a target="_blank" href={readUrls.filesUrl}>files</a>
    </>}
    <table>
      {readUrls.grpcUrl && <tr><td>gRPC</td> <td><pre>{readUrls.grpcUrl}</pre></td></tr>}
                           <tr><td>HTTP</td> <td><pre>{readUrls.httpUrl}</pre></td></tr>
      {isLocal &&          <tr><td>Admin</td><td><pre>{readUrls.httpAdminUrl}</pre></td></tr>}
    </table>
  </div>
}
