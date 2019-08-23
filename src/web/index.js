import { ec } from 'elliptic'
import { rnodeClient, signDeploy } from '@tgrospic/rnode-grpc-js'

import { DeployServiceClient } from '../../rnode-grpc-gen/js/DeployService_grpc_web_pb'
import protoSchema from '../../rnode-grpc-gen/js/pbjs_generated.json'

const { log, warn } = console

// const grpcServerUrl = 'http://localhost:44401'
const grpcServerUrl = 'https://testnet-8.grpc.rchain.isotypic.com'
// const grpcServerUrl = 'https://devnet-3.grpc.rchain.isotypic.com'
// const grpcServerUrl = 'https://sandboxnet-3.grpc.rchain.isotypic.com'

const grpcService = new DeployServiceClient(grpcServerUrl)

const {
  getBlocks,
  lastFinalizedBlock,
  visualizeDag,
  listenForDataAtName,
  DoDeploy,
} = rnodeClient(grpcService, { protoSchema })

const main = async () => {
  // Examples of requests to RNode

  const lastBlockObj = await lastFinalizedBlock()
  log('LAST BLOCK', lastBlockObj)


  const blocks = await getBlocks({ depth: 2 })
  log('BLOCKS', blocks)


  const vdagObj = await visualizeDag({ depth: 2, showJustificationLines: true })
  log('VDAG', vdagObj.map(x => x.content).join(''))


  const listenData = await listenForDataAtName({
    depth: 10,
    name: { exprs: [{g_string: 'RChain'}, {g_int: 123}] },
  })
  log('LISTEN', listenData)

  // Sample deploy

  const secp256k1 = new ec('secp256k1')
  const key = secp256k1.genKeyPair()

  const deployData = {
    term: 'new a in { Nil }',
    phloLimit: 10e3,
  }
  const deploy = signDeploy(key, deployData)
  log('SIGNED DEPLOY', deploy)

  const { message } = await DoDeploy(deploy).catch(x => warn(x.message, x.data))
  log('DEPLOY RESPONSE', message)
}

main()
