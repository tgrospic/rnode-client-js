import { rnodeClient } from '@tgrospic/rnode-grpc-js'

import { DeployServiceClient } from '../../rnode-grpc-gen/js/DeployService_grpc_web_pb'
import protoSchema from '../../rnode-grpc-gen/js/pbjs_generated.json'

const { log, warn } = console

const grpcServerUrl = 'http://localhost:44401'
const grpcService = new DeployServiceClient(grpcServerUrl)

const {
  getBlocks,
  lastFinalizedBlock,
  visualizeDag,
  listenForDataAtName,
} = rnodeClient(grpcService, { protoSchema })

const main = async () => {

  const blocks = await getBlocks({ depth: 4 })
  log('BLOCKS', blocks)


  const lastBlockObj = await lastFinalizedBlock()
  log('LAST_BLOCK', lastBlockObj)


  const vdagObj = await visualizeDag({ depth: 4, showJustificationLines: true })
  log('VDAG', vdagObj.map(x => x.content).join(''))


  const listenData = await listenForDataAtName({
    depth: 10,
    name: { exprs: [{g_string: 'RChain'}, {g_int: 123}] },
  })
  log('LISTEN', listenData)
}

main()
