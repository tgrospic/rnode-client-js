// Reference to TypeScript definitions for IntelliSense in VSCode
/// <reference path="../../rnode-grpc-gen/js/rnode-grpc-js.d.ts" />
// @ts-check
const grpc = require('@grpc/grpc-js')
const { ec } = require('elliptic')
const { blake2bHex } = require('blakejs')

const { rnodeService, rnodeProtobuf, signDeploy, verifyDeploy } = require('@tgrospic/rnode-grpc-js')

const protoSchema = require('../../rnode-grpc-gen/js/pbjs_generated.json')
require('../../rnode-grpc-gen/js/DeployServiceV1_pb')
require('../../rnode-grpc-gen/js/ProposeServiceV1_pb')

const { log, warn } = console

const rnodeUrl = 'localhost:40402'
// const rnodeUrl = 'node3.testnet.rchain.coop:40401'

const secp256k1 = new ec('secp256k1')

const rnodeExample = async args => {
  // RNode client options
  const options = host => ({ grpcLib: grpc, host, protoSchema })
  // RNode API methods
  const { getBlocks, previewPrivateNames, doDeploy, propose } = rnodeService(options(rnodeUrl))

  // Protobuf serializer for Par (Rholang AST).
  const { Par } = rnodeProtobuf({ protoSchema })

  /*
   * NOTE: This example is only valid until RNode v0.12.x version.
   * =============================================================
   *
   * To insert data to the registry, with the signature, tuple `(nonce, data)`
   * must be signed by the client.
   *
   *   - `nonce`: number increasing with each insert
   *   - `data` : data we wish to store in the registry
   *              (unforgeable name when storing a contract)
   *
   * Signing this tuple on the client side gives a proof to Rholang that owner
   * of the private/public key has permission to insert/update data associated for this key,
   * from which registry address is generated.
   *
   * So in Rholang we supply this information to `rho:registry:insertSigned:secp256k1`.
   *
   *   - public key (used for checking the signature)
   *   - `(nonce, data)`
   *   - signature of `(nonce, data)`
   *
   * When storing a contract in the registry we first need to generate the same unforgeable name
   * which Rholang will generate when deploying the contract. For this we need to call RNode with
   * _timestamp_ and _public key_ used later in deploy data.
   *
   * Note: we also need timestamp to create deploy, so in this example
   *       the same number is used for both purposes.
   */

  // Private/public key used to sign a deploy.
  const deployPrivateKey = secp256k1.keyFromPrivate('<private_key_hex>')
  const deployPublicKey  = Uint8Array.from(deployPrivateKey.getPublic('array'))

  // Timestamp used in deploy data.
  const timestamp = Date.now()

  // Unforgeable name on which contract in the registry will be registered.
  const { payload: { idsList: [ unforgName ] } } = await previewPrivateNames({
    timestamp, user: deployPublicKey, nameqty: 1
  })

  // Build a tuple with Rholang AST (source for signing).
  // (nonce, unforgName)
  const nonce = timestamp // increase nonce with each insert/update
  const dataToSign = Par.serialize({
    exprsList: [{
      eTupleBody: {
        psList: [{
          // `nonce`: number increasing with each insert
          exprsList: [{ gInt: nonce }]
        }, {
          // `data` : channel (unforgeable name) of the contract
          bundlesList: [{
            body: {
              unforgeablesList: [{
                gPrivateBody: { id: unforgName }
              }]
            },
            // Unforgeable name is write only `bundle+{*unforgName}`
            writeflag: true,
            readflag: false
          }]
          // Instead of unforgeable name we can store any process.
          // exprsList: [{ gString: "My data in registry!" }]
        }]
      }
    }]
  })

  // Private/public key used for signing registry access (it can be the same as deploy key).
  const privateKey   = secp256k1.keyFromPrivate('<private_key_hex>')
  const publicKeyHex = privateKey.getPublic('hex')
  // log("PRIV KEY", secp256k1.genKeyPair().getPrivate('hex')) // generate new key

  // Sign `(nonce, unforgName)`
  const hashed       = blake2bHex(dataToSign, void 666, 32)
  const signatureHex = privateKey.sign(hashed, {canonical: true}).toDER('hex')

  const contract = `
    new MyContract, rs(\`rho:registry:insertSigned:secp256k1\`), uriOut, out(\`rho:io:stdout\`)
    in {
      contract MyContract(ret) = {
        ret!("Hello Arthur!")
      } |

      rs!(
        "${publicKeyHex}".hexToBytes(),
        (${nonce}, bundle+{*MyContract}),
        "${signatureHex}".hexToBytes(),
        *uriOut
      ) |

      for(@uri <- uriOut) {
        out!(("Registered", uri))
      }
    }
  `
  // Get latest block number from RNode
  const [ block ]   = await getBlocks({ depth: 1 })
  const lastBlockNr = block.blockinfo.blocknumber

  const deployData = {
    term: contract,
    timestamp,
    phloprice: 1,
    phlolimit: 150e3,
    validafterblocknumber: lastBlockNr,
    shardid: 'root',
  }

  const deploy = signDeploy(deployPrivateKey, deployData)
  log('SIGNED DEPLOY', deploy)

  const isValidDeploy = verifyDeploy(deploy)
  log('DEPLOY IS VALID', isValidDeploy)

  const { result } = await doDeploy(deploy)
  log('DEPLOY RESPONSE', result)

  if (rnodeUrl.match(/localhost/)) {
    const { result: proposeRes } = await propose()
    log('PROPOSE RESPONSE', proposeRes)
  }

}

rnodeExample(process.argv)
