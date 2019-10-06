// Reference to TypeScript definitions for IntelliSense in VSCode
/// <reference path="../../rnode-grpc-gen/js/rnode-grpc-js.d.ts" />
const grpc = require('@grpc/grpc-js')
const { ec } = require('elliptic')
const { rnodeDeploy, rnodePropose, signDeploy, verifyDeploy } = require('@tgrospic/rnode-grpc-js')

// Generated files with rnode-grpc-js tool
const protoSchema = require('../../rnode-grpc-gen/js/pbjs_generated.json')
// Import generated protobuf types (in global scope)
require('../../rnode-grpc-gen/js/DeployService_pb')
require('../../rnode-grpc-gen/js/ProposeService_pb')

const { log, warn } = console

const sampleRholangCode = 'new out(`rho:io:stdout`) in { out!("Nodejs deploy test") }'

const rnodeExternalUrl = 'localhost:50401'
// const rnodeExternalUrl = 'node8.testnet.rchain-dev.tk:40401'

// NOTE: in the future, propose service will be available only on the internal port
const rnodeInternalUrl = 'localhost:50402'

const rnodeExample = async () => {
  // Get RNode service methods
  const options = url => ({
    client: new grpc.Client(url, grpc.credentials.createInsecure()),
    protoSchema,
  })

  const {
    getBlocks,
    lastFinalizedBlock,
    visualizeDag,
    listenForDataAtName,
    DoDeploy,
  } = rnodeDeploy(options(rnodeExternalUrl))

  const { propose } = rnodePropose(options(rnodeInternalUrl))

  // Examples of requests to RNode

  const lastBlockObj = await lastFinalizedBlock()
  log('LAST BLOCK', lastBlockObj)


  const blocks = await getBlocks({ depth: 2 })
  log('BLOCKS', blocks)


  const vdagObj = await visualizeDag({ depth: 2, showjustificationlines: true })
  log('VDAG', vdagObj.map(x => x.content).join(''))


  const listenData = await listenForDataAtName({
    depth: 10,
    name: { exprsList: [{gString: 'RChain'}, {gInt: 123}] },
  })
  log('LISTEN', listenData)

  // Sample deploy

  const secp256k1 = new ec('secp256k1')
  const key = secp256k1.genKeyPair()
  // const key = '1bf36a3d89c27ddef7955684b97667c75454317d8964528e57b2308947b250b0'

  const deployData = {
    term: sampleRholangCode,
    phlolimit: 10e3,
  }
  const deploy = signDeploy(key, deployData)
  log('SIGNED DEPLOY', deploy)

  const isValidDeploy = verifyDeploy(deploy)
  log('DEPLOY IS VALID', isValidDeploy)

  const { message } = await DoDeploy(deploy)
  log('DEPLOY RESPONSE', message)


  await propose()
  log('PROPOSE successful!')
}

rnodeExample()
