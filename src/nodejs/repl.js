// Reference to TypeScript definitions for IntelliSense in VSCode
/// <reference path="../../rnode-grpc-gen/js/rnode-grpc-js.d.ts" />
const grpc = require('@grpc/grpc-js')
const { rnodeRepl } = require('@tgrospic/rnode-grpc-js')

// Generated files with rnode-grpc-js tool
const protoSchema = require('../../rnode-grpc-gen/js/pbjs_generated.json')
// Import generated protobuf types (in global scope)
require('../../rnode-grpc-gen/js/repl_pb')

const { log } = console

const sampleRholangCode = 'new out(`rho:io:stdout`) in { out!("Nodejs deploy test") }'

const rnodeInternalUrl = 'localhost:50402'

const options = {
  client: new grpc.Client(rnodeInternalUrl, grpc.credentials.createInsecure()),
  protoSchema,
}

const { Eval } = rnodeRepl(options)

const main = async () => {
  // Examples of eval request to RNode

  const evalResult = await Eval({ program: sampleRholangCode })
  log('EVAL', evalResult.output)
}

main()
