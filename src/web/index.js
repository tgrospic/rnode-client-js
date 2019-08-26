// Reference to TypeScript definitions for IntelliSense in VSCode
/// <reference path="../../rnode-grpc-gen/js/rnode-grps-js.d.ts" />
import { ec } from 'elliptic'
import m from 'mithril'
import { rnodeDeploy, rnodePropose, signDeploy } from '@tgrospic/rnode-grpc-js'

// Generated files with rnode-grpc-js tool
import { DeployServiceClient } from '../../rnode-grpc-gen/js/DeployService_grpc_web_pb'
import { ProposeServiceClient } from '../../rnode-grpc-gen/js/ProposeService_grpc_web_pb'
import protoSchema from '../../rnode-grpc-gen/js/pbjs_generated.json'

const { log, warn } = console

const deployRholangCode = 'new out(`rho:io:stdout`) in { out!("Browser deploy test") }'

// const rnodeUrl = 'http://localhost:44401'
// const rnodeUrl = 'https://testnet-8.grpc.rchain.isotypic.com'
// const rnodeUrl = 'https://devnet-3.grpc.rchain.isotypic.com'
// const rnodeUrl = 'https://sandboxnet-3.grpc.rchain.isotypic.com'

const main = async rnodeUrl => {
  const deployService = new DeployServiceClient(rnodeUrl)
  const proposeService = new ProposeServiceClient(rnodeUrl)

  const {
    getBlocks,
    lastFinalizedBlock,
    visualizeDag,
    listenForDataAtName,
    DoDeploy,
  } = rnodeDeploy(deployService, { protoSchema })

  const { propose } = rnodePropose(proposeService, { protoSchema })

  // Examples of requests to RNode

  const lastBlockObj = await lastFinalizedBlock()
  log('LAST BLOCK', lastBlockObj)


  const blocks = await getBlocks({ depth: 2 })
  log('BLOCKS', blocks)


  const vdagObj = await visualizeDag({ depth: 2, showJustificationLines: true })
  log('VDAG', vdagObj.map(x => x.content).join(''))


  const listenData = await listenForDataAtName({
    depth: 10,
    name: { exprs: [{gString: 'RChain'}, {gInt: 123}] },
  })
  log('LISTEN', listenData)

  // Sample deploy

  const secp256k1 = new ec('secp256k1')
  const key = secp256k1.genKeyPair()

  const deployData = {
    term: deployRholangCode,
    phloLimit: 10e3,
  }
  const deploy = signDeploy(key, deployData)
  log('SIGNED DEPLOY', deploy)

  const { message } = await DoDeploy(deploy).catch(x => warn(x.message, x.data))
  log('DEPLOY RESPONSE', message)


  await propose()
  log('PROPOSE successful!')
}

/*
  Additional stuff only for the browser example.

  This will display a dropdown with textnet, devnet and sandboxnet validators.
  Selection will display grpc and proxy http address which is used to
  make sample requests to RNode from the browser.
*/

// Available networks and validators
const proxyNets = [
  // node{0-9}.testnet.rchain-dev.tk
  // https://testnet-{0-9}.grpc.rchain.isotypic.com
  ['testnet', 10],
  // node{0-4}.devnet.rchain-dev.tk
  // https://devnet-{0-4}.grpc.rchain.isotypic.com
  ['devnet', 5],
  // node{0-4}.sandboxnet.rchain-dev.tk
  // https://sandboxnet-{0-4}.grpc.rchain.isotypic.com
  ['sandboxnet', 5],
]

const localProxyNet = { label: 'local', urls: [
  {grpc: 'localhost:40401', http: 'http://localhost:44401'},
]}

const getUrls = net => n => ({
  grpc: `node${n}.${net}.rchain-dev.tk`,
  http: `https://${net}-${n}.grpc.rchain.isotypic.com`,
})

const range = n => [...Array(n).keys()]

const getNetworkUrls = ([net, size]) => ({
  label: net,
  urls: range(size).map(getUrls(net)),
})

const findByIndex = (nets, index) => nets.flatMap(({urls}) => urls)[index]

const mainView = r => ({nets, sel}) =>
  m('div',
    m('.title', m('pre', sel.grpc), ` <proxy> `, m('pre', sel.http)),
    m('select', {
        // `r` accepts next state to render when selection is changed
        onchange: ev => r({nets, sel: findByIndex(nets, ev.target.selectedIndex)}),
      },
      nets.map(({label, urls}) =>
        m('optgroup', {label},
          urls.map(({grpc, http}) =>
            m('option', {title: http, selected: sel && sel.grpc === grpc}, grpc)
          ),
        ),
      ),
    ),
    m('button',
      {onclick: _ => main(sel.http)},
      'Execute sample requests'
    ),
  )

const netsGrouped = proxyNets.map(getNetworkUrls)

const initialState = {
  // Validators to choose
  nets: [localProxyNet, ...netsGrouped],
  // Selected validator
  sel: netsGrouped[0].urls[0],
}

// Wraps Virtual DOM renderer to render state
const makeRenderer = (element, view) => state => {
  const render = st => m.render(element, view(render)(st))
  render(state)
}

// App renderer / this `r` works similar as `r` inside view
const r = makeRenderer(document.querySelector('#app'), mainView)

// Start app / the big bang!
r(initialState)
