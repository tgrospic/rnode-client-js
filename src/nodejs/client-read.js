// Reference to TypeScript definitions for IntelliSense in VSCode
/// <reference path="../../rnode-grpc-gen/js/rnode-grpc-js.d.ts" />
// @ts-check
const grpc = require('@grpc/grpc-js')
const { ec } = require('elliptic')

const { rnodeDeploy, rhoParToJson } = require('@tgrospic/rnode-grpc-js')

// Generated files with rnode-grpc-js tool
const protoSchema = require('../../rnode-grpc-gen/js/pbjs_generated.json')
// Import generated protobuf types (in global scope)
require('../../rnode-grpc-gen/js/DeployServiceV1_pb')
require('../../rnode-grpc-gen/js/ProposeServiceV1_pb')

const { log, warn } = console
const util = require('util')

const sampleRholangCode = `
  new return, out(\`rho:io:stdout\`), x in {
    out!("Nodejs exploretory deploy test") |

    // Return value from Rholang
    // NOTE: exploratory deploy uses first defined channel to return values
    return!(("Return value from exploretory deploy", [1], true, Set(42), {"my_key": "My value"}, *x))
  }
`

const rnodeExternalUrl = 'localhost:40411'
// const rnodeExternalUrl = 'observer.testnet.rchain.coop:40401'

const rnodeExample = async () => {
  // Get RNode service methods
  const options = host => ({ grpcLib: grpc, host, protoSchema })

  const { exploratoryDeploy } = rnodeDeploy(options(rnodeExternalUrl))

  // Get result from exploratory (read-only) deploy
  const { result: { postblockdataList, block } } = await exploratoryDeploy({
    term: sampleRholangCode,
  })
  log('BLOCK', util.inspect(block, {depth: 100, colors: true}))

  // Raw data (Par objects) returned from Rholang
  const pars = postblockdataList

  log('RAW_DATA', util.inspect(pars, {depth: 100, colors: true}))

  // Rholang term converted to JSON
  // NOTE: Only part of Rholang types are converted:
  //       primitive types, List, Set, object (Map), Uri, ByteArray, unforgeable names.
  const json = pars.map(rhoParToJson)

  log('JSON', util.inspect(json, {depth: 100, colors: true}))
}

rnodeExample()
