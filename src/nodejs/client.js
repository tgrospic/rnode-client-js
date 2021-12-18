// Reference to TypeScript definitions for IntelliSense in VSCode
/// <reference path="../../rnode-grpc-gen/js/rnode-grpc-js.d.ts" />
// @ts-check
const grpc = require('@grpc/grpc-js')
const { ec } = require('elliptic')

const { rnodeDeploy, rnodePropose, signDeploy, verifyDeploy, rhoParToJson } = require('@tgrospic/rnode-grpc-js')

// Generated files with rnode-grpc-js tool
const protoSchema = require('../../rnode-grpc-gen/js/pbjs_generated.json')
// Import generated protobuf types (in global scope)
require('../../rnode-grpc-gen/js/DeployServiceV1_pb')
require('../../rnode-grpc-gen/js/ProposeServiceV1_pb')

const { log, warn } = console
const util = require('util')

const sampleRholangCode = `
  new return(\`rho:rchain:deployId\`), out(\`rho:io:stdout\`), x in {
    out!("Nodejs deploy test") |

    // Return value from Rholang
    return!(("Return value from deploy", [1], true, Set(42), {"my_key": "My value"}, *x))
  }
`

const rnodeExternalUrl = 'localhost:40401'
// const rnodeExternalUrl = 'node3.testnet.rchain.coop:40401'

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


  // Sample deploy

  const secp256k1 = new ec('secp256k1')
  // const key = secp256k1.genKeyPair()
  const key = 'bb6f30056d1981b98e729cef72a82920e6242a4395e500bd24bd6c6e6a65c36c'

  const deployData = {
    term: sampleRholangCode,
    timestamp: Date.now(),
    phloprice: 1,
    phlolimit: 10e3,
    validafterblocknumber: lastBlockObj.blockinfo?.blockinfo.blocknumber || 0,
  }
  const deploy = signDeploy(key, deployData)
  log('SIGNED DEPLOY', deploy)

  const isValidDeploy = verifyDeploy(deploy)
  log('DEPLOY IS VALID', isValidDeploy)

  const { result } = await doDeploy(deploy)
  log('DEPLOY RESPONSE', result)

  // Create new block with deploy

  const { result: proposeRes } = await propose()
  log('PROPOSE RESPONSE', proposeRes)

  // Get result from deploy

  const { payload: { blockinfoList } } = await listenForDataAtName({
    depth: 5,
    name: { unforgeablesList: [{gDeployIdBody: { sig: deploy.sig }}] },
  })

  // Raw data (Par objects) returned from Rholang
  const pars = blockinfoList[0].postblockdataList

  log('RAW_DATA', util.inspect(pars, {depth: 100, colors: true}))

  // Rholang term converted to JSON
  // NOTE: Only part of Rholang types are converted:
  //       primitive types, List, Set, object (Map), Uri, ByteArray, unforgeable names.
  const json = pars.map(rhoParToJson)

  log('JSON', util.inspect(json, {depth: 100, colors: true}))
}

rnodeExample()
