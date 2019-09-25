// Reference to TypeScript definitions for IntelliSense in VSCode
/// <reference path="../../rnode-grpc-gen/js/rnode-grpc-js.d.ts" />
const grpc = require('grpc')
const { rnodeRepl } = require('@tgrospic/rnode-grpc-js')

// Generated files with rnode-grpc-js tool
const { ReplClient } = require('../../rnode-grpc-gen/js/repl_grpc_pb')
const protoSchema = require('../../rnode-grpc-gen/js/pbjs_generated.json')

const { log } = console

const sampleRholangCode = 'new out(`rho:io:stdout`) in { out!("Nodejs deploy test") }'

const rnodeInternalUrl = 'localhost:40402'

const replClient = new ReplClient(rnodeInternalUrl, grpc.credentials.createInsecure())

const { Eval } = rnodeRepl(replClient, { protoSchema })

const main = async () => {
  // Examples of eval request to RNode

  const evalResult = await Eval({ program: sampleRholangCode })
  log('EVAL', evalResult.output)
}

main()
