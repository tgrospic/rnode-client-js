// Reference to TypeScript definitions for IntelliSense in VSCode
/// <reference path="../../rnode-grpc-gen/js/rnode-grps-js.d.ts" />
const grpc = require('grpc')
const { ec } = require('elliptic')
const { rnodeDeploy, rnodePropose, signDeploy } = require('@tgrospic/rnode-grpc-js')

// Generated files with rnode-grpc-js tool
const { DeployServiceClient } = require('../../rnode-grpc-gen/js/DeployService_grpc_pb')
const { ProposeServiceClient } = require('../../rnode-grpc-gen/js/ProposeService_grpc_pb')
const protoSchema = require('../../rnode-grpc-gen/js/pbjs_generated.json')

const { log, warn } = console

const deployRholangCode = 'new out(`rho:io:stdout`) in { out!("Nodejs deploy test") }'

// const rnodeUrl = 'localhost:40401'
const rnodeUrl = 'node8.testnet.rchain-dev.tk:40401'
// const rnodeUrl = 'node3.devnet.rchain-dev.tk:40401'
// const rnodeUrl = 'node4.sandboxnet.rchain-dev.tk:40401'

const deployService = new DeployServiceClient(rnodeUrl, grpc.credentials.createInsecure())
const proposeService = new ProposeServiceClient(rnodeUrl, grpc.credentials.createInsecure())

const {
  getBlocks,
  lastFinalizedBlock,
  visualizeDag,
  listenForDataAtName,
  DoDeploy,
} = rnodeDeploy(deployService, { protoSchema })

const { propose } = rnodePropose(proposeService, { protoSchema })

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

main()
