// Rholang code to transfer REVs
// https://github.com/rchain/rchain/blob/3eca061/rholang/examples/vault_demo/3.transfer_funds.rho
export const transferFunds_rho = (revAddrFrom, revAddrTo, amount) => `
  new
    rl(\`rho:registry:lookup\`), RevVaultCh,
    stdout(\`rho:io:stdout\`)
  in {

    rl!(\`rho:rchain:revVault\`, *RevVaultCh) |
    for (@(_, RevVault) <- RevVaultCh) {

      stdout!(("3.transfer_funds.rho")) |

      match ("${revAddrFrom}", "${revAddrTo}", ${amount}) {
        (from, to, amount) => {

          new vaultCh, revVaultkeyCh, deployerId(\`rho:rchain:deployerId\`) in {
            @RevVault!("findOrCreate", from, *vaultCh) |
            @RevVault!("deployerAuthKey", *deployerId, *revVaultkeyCh) |
            for (@(true, vault) <- vaultCh; key <- revVaultkeyCh) {

              stdout!(("Beginning transfer of ", amount, "REV from", from, "to", to)) |

              new resultCh in {
                @vault!("transfer", to, amount, *key, *resultCh) |
                for (@result <- resultCh) {

                  stdout!(("Finished transfer of ", amount, "REV to", to, "result was:", result))
                }
              }
            }
          }

        }
      }
    }
  }
`
