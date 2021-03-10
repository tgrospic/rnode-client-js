/**
 * Rholang code to transfer REVs
 * https://github.com/rchain/rchain/blob/3eca061/rholang/examples/vault_demo/3.transfer_funds.rho
 *
 * NOTE: Leading whitespaces are removed to fix strange bug in Trezor<->Metamask communication.
 * https://github.com/tgrospic/rnode-client-js/issues/22
 */
export const transferFunds_rho = (revAddrFrom, revAddrTo, amount) => `
new rl(\`rho:registry:lookup\`), RevVaultCh in {
rl!(\`rho:rchain:revVault\`, *RevVaultCh) |
for (@(_, RevVault) <- RevVaultCh) {
new vaultCh, vaultTo, revVaultkeyCh,
deployerId(\`rho:rchain:deployerId\`),
deployId(\`rho:rchain:deployId\`)
in {
match ("${revAddrFrom}", "${revAddrTo}", ${amount}) {
(revAddrFrom, revAddrTo, amount) => {
@RevVault!("findOrCreate", revAddrFrom, *vaultCh) |
@RevVault!("findOrCreate", revAddrTo, *vaultTo) |
@RevVault!("deployerAuthKey", *deployerId, *revVaultkeyCh) |
for (@vault <- vaultCh; key <- revVaultkeyCh; _ <- vaultTo) {
match vault {
(true, vault) => {
new resultCh in {
@vault!("transfer", revAddrTo, amount, *key, *resultCh) |
for (@result <- resultCh) {
match result {
(true , _  ) => deployId!((true, "Transfer successful (not yet finalized)."))
(false, err) => deployId!((false, err))
}
}
}
}
err => {
deployId!((false, "REV vault cannot be found or created."))
}
}
}
}
}
}
}
}
`
