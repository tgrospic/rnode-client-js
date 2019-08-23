const grpc = require('grpc')
const { ec } = require('elliptic')
const { rnodeClient, signDeploy } = require('@tgrospic/rnode-grpc-js')

const { DeployServiceClient } = require('../../rnode-grpc-gen/js/DeployService_grpc_pb')
const protoSchema = require('../../rnode-grpc-gen/js/pbjs_generated.json')

const { log, warn } = console

// const grpcServerUrl = 'localhost:40401'
const grpcServerUrl = 'node8.testnet.rchain-dev.tk:40401'
// const grpcServerUrl = 'node3.devnet.rchain-dev.tk:40401'
// const grpcServerUrl = 'node4.sandboxnet.rchain-dev.tk:40401'

const grpcService = new DeployServiceClient(grpcServerUrl, grpc.credentials.createInsecure())

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
