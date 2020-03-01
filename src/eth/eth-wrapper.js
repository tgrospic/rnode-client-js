// Metamask wrapper for Ethereum provider
// https://metamask.github.io/metamask-docs/guide/ethereum-provider.html#methods-new-api

// Ethereum object injected by Metamask
const eth_ = window.ethereum

export const ethDetected = !!eth_

// Send a request to Ethereum API (Metamask)
const ethSend = (method, args) => {
  if (!eth_) throw Error(`Ethereum (Metamask) not detected.`)

  return eth_.send(method, args).then(x => x.result)
}

// Request an address from the user
// - the first request will ask the user for permission
// - in Metamask settings the connection can be deleted
export const ethereumAddress = async () => {
  const accounts = await ethSend('eth_requestAccounts')

  if (!Array.isArray(accounts))
    throw Error(`Ethereum RPC response is not a list of accounts.`)

  // Returns ETH address in hex format
  return accounts[0]
}

// Ethereum personal signature
export const ethereumSign = async (data, ethAddr) => {
  // Create args, fix arrays/buffers
  const args = [[...data], ethAddr]

  // Returns signature in hex format
  return await ethSend('personal_sign', args)
}
