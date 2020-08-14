// Metamask wrapper for Ethereum provider
// https://metamask.github.io/metamask-docs/guide/ethereum-provider.html#methods-new-api
// Updated by EIP-1193 (ethereum.request)
// https://eips.ethereum.org/EIPS/eip-1193

// Ethereum object injected by Metamask
const eth_ = window.ethereum

export const ethDetected = !!eth_

// https://docs.metamask.io/guide/ethereum-provider.html#properties
if (ethDetected) eth_.autoRefreshOnNetworkChange = false

// Send a request to Ethereum API (Metamask)
const ethRequest = (method, args) => {
  if (!eth_) throw Error(`Ethereum (Metamask) not detected.`)

  return eth_.request({method, ...args})
}

// Request an address selected in Metamask
// - the first request will ask the user for permission
export const ethereumAddress = async () => {
  const accounts = await ethRequest('eth_requestAccounts')

  if (!Array.isArray(accounts))
    throw Error(`Ethereum RPC response is not a list of accounts (${accounts}).`)

  // Returns ETH address in hex format
  return accounts[0]
}

// Ethereum personal signature
// https://github.com/ethereum/go-ethereum/wiki/Management-APIs#personal_sign
export const ethereumSign = async (bytes, ethAddr) => {
  // Create args, fix arrays/buffers
  const args = { params: [[...bytes], ethAddr] }

  // Returns signature in hex format
  return await ethRequest('personal_sign', args)
}
