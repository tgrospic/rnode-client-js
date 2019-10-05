import { ec } from 'elliptic'
import { startApp } from '../web/controls/main-ctrl' // web example addition (not in TypeScript)
import { rnodeDeploy, rnodePropose, signDeploy, verifyDeploy, UnsignedDeployData } from '@tgrospic/rnode-grpc-js'

// Generated files with rnode-grpc-js tool
import { DeployServiceClient } from '../../rnode-grpc-gen/js/DeployService_grpc_web_pb'
import { ProposeServiceClient } from '../../rnode-grpc-gen/js/ProposeService_grpc_web_pb'
import * as protoSchema from '../../rnode-grpc-gen/js/pbjs_generated.json'

const { log, warn } = console

const sampleRholangCode = 'new out(`rho:io:stdout`) in { out!("Browser deploy test") }'

// const rnodeExternalUrl = 'http://localhost:44401'
// const rnodeExternalUrl = 'https://testnet-8.grpc.rchain.isotypic.com'

// NOTE: in the future, propose service will be available only on the internal port
// const rnodeInternalUrl = 'http://localhost:44402'

const rnodeExample = async (rnodeUrl: string) => {
  // Instantiate http clients
  const deployService  = new DeployServiceClient(rnodeUrl)
  const proposeService = new ProposeServiceClient(rnodeUrl)

  // Get RNode service methods

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

  const deployData: UnsignedDeployData = {
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

// Start main app (not in TypeScript)
startApp(rnodeExample)
