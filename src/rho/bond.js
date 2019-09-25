// Rholang code to bond a validator
export const posBond_rho = amount => `
  new retCh, PoSCh, rl(\`rho:registry:lookup\`), stdout(\`rho:io:stdout\`) in {
    stdout!("About to lookup pos contract...") |

    rl!(\`rho:rchain:pos\`, *PoSCh) |

    for(@(_, PoS) <- PoSCh) {
      stdout!("About to bond...") |

      @PoS!("bond", ${amount}, *retCh) |
      for ( ret <- retCh) {
        stdout!("PoS return!") |
        match *ret {
          {(true, message)} => stdout!(("BOND_SUCCESS", "Successfully bonded!", message))

          {(false, message)} => stdout!(("BOND_ERROR", message))
        }
      }
    }
  }
`
