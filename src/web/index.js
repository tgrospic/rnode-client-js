// Reference to TypeScript definitions for IntelliSense in VSCode
/// <reference path="../../rnode-grpc-gen/js/rnode-grpc-js.d.ts" />
import grpcWeb from 'grpc-web'
import { ec } from 'elliptic'
import { rnodeDeploy, rnodePropose, signDeploy, verifyDeploy } from '@tgrospic/rnode-grpc-js'

// Generated files with rnode-grpc-js tool
import protoSchema from '../../rnode-grpc-gen/js/pbjs_generated.json'
// Import generated protobuf types (in global scope)
import '../../rnode-grpc-gen/js/DeployServiceV1_pb'
import '../../rnode-grpc-gen/js/ProposeServiceV1_pb'

// Web example with REV transfer and balance check
import { startApp } from './controls/main-ctrl'

const { log, warn } = console

const sampleRholangCode = 'new out(`rho:io:stdout`) in { out!("Browser deploy test") }'

// const rnodeExternalUrl = 'http://localhost:44401'
// const rnodeExternalUrl = 'https://testnet-8.grpc.rchain.isotypic.com'

// NOTE: propose service is available only on the internal port
// const rnodeInternalUrl = 'http://localhost:44402'

const rnodeExample = async rnodeUrl => {
  // Get RNode service methods
  const options = { grpcLib: grpcWeb, host: rnodeUrl, protoSchema }

  const {
    getBlocks,
    lastFinalizedBlock,
    visualizeDag,
    listenForDataAtName,
    doDeploy,
  } = rnodeDeploy(options)

  const { propose } = rnodePropose(options)

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

  const lastBlockNumber = blocks.length && blocks[0].blockinfo.blocknumber
  const deployData = {
    term: sampleRholangCode,
    timestamp: Date.now(),
    phloprice: 1,
    phlolimit: 10e3,
    validafterblocknumber: lastBlockNumber || 0,
  }
  const deploy = signDeploy(key, deployData)
  log('SIGNED DEPLOY', deploy)

  const isValidDeploy = verifyDeploy(deploy)
  log('DEPLOY IS VALID', isValidDeploy)

  const { result } = await doDeploy(deploy)
  log('DEPLOY RESPONSE', result)


  if (!!rnodeUrl.match(/localhost/)) {
    const { result: proposeRes } = await propose()
    log('PROPOSE successful!', proposeRes)
  }
}

// Start main app
startApp()
