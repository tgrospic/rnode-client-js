// Reference to TypeScript definitions for IntelliSense in VSCode
/// <reference path="../../rnode-grpc-gen/js/rnode-grpc-js.d.ts" />
const grpc = require('@grpc/grpc-js')
const { ec } = require('elliptic')
const { rnodeDeploy, rnodePropose, signDeploy, verifyDeploy } = require('@tgrospic/rnode-grpc-js')

// Generated files with rnode-grpc-js tool
const protoSchema = require('../../rnode-grpc-gen/js/pbjs_generated.json')
// Import generated protobuf types (in global scope)
require('../../rnode-grpc-gen/js/DeployServiceV1_pb')
require('../../rnode-grpc-gen/js/ProposeServiceV1_pb')

const { log, warn } = console

const sampleRholangCode = 'new out(`rho:io:stdout`) in { out!("Nodejs deploy test") }'

const rnodeExternalUrl = 'localhost:40401'
// const rnodeExternalUrl = 'node8.testnet.rchain-dev.tk:40401'

const rnodeInternalUrl = 'localhost:40402'

const rnodeExample = async () => {
  // Get RNode service methods
  const options = host => ({ grpcLib: grpc, host, protoSchema })

  const {
    getBlocks,
    lastFinalizedBlock,
    visualizeDag,
    listenForDataAtName,
    doDeploy,
  } = rnodeDeploy(options(rnodeExternalUrl))

  const { propose } = rnodePropose(options(rnodeInternalUrl))

  // Examples of requests to RNode

  const lastBlockObj = await lastFinalizedBlock()
  log('LAST BLOCK', lastBlockObj)


  const blocks = await getBlocks({ depth: 1 })
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
    // TEMP: in RNode v0.9.16 'valid after block number' must be zero
    // so that signature will be valid.
    // Future versions will require correct block number.
    validafterblocknumber: 0,
  }
  const deploy = signDeploy(key, deployData)
  log('SIGNED DEPLOY', deploy)

  const isValidDeploy = verifyDeploy(deploy)
  log('DEPLOY IS VALID', isValidDeploy)

  const { result } = await doDeploy(deploy)
  log('DEPLOY RESPONSE', result)


  const { result: proposeRes } = await propose()
  log('PROPOSE RESPONSE', proposeRes)
}

rnodeExample()
