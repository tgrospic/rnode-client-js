// Metamask wrapper for Ethereum provider
// https://metamask.github.io/metamask-docs/guide/ethereum-provider.html#methods-new-api
// Updated by EIP-1193 (ethereum.request)
// https://eips.ethereum.org/EIPS/eip-1193

type EthRequestName = 'eth_requestAccounts' | 'personal_sign'

// Ethereum object injected by Metamask
// @ts-ignore
const eth_ = window.ethereum

export const ethDetected = !!eth_

// https://docs.metamask.io/guide/ethereum-provider.html#properties
if (ethDetected) eth_.autoRefreshOnNetworkChange = false

// Send a request to Ethereum API (Metamask)
const ethRequest = (method: EthRequestName, args?: any) => {
  if (!eth_) throw Error(`Ethereum (Metamask) not detected.`)

  return eth_.request({method, ...args})
}

/**
 * Request an address selected in Metamask
 * - the first request will ask the user for permission
 *
 * @returns Base 16 ETH address
 */
export const ethereumAddress = async () => {
  const accounts = await ethRequest('eth_requestAccounts')

  if (!Array.isArray(accounts))
    throw Error(`Ethereum RPC response is not a list of accounts (${accounts}).`)

  // Returns ETH address in hex format
  return accounts[0] as string
}

/**
 * Ethereum personal signature
 * https://github.com/ethereum/go-ethereum/wiki/Management-APIs#personal_sign
 *
 * @param bytes - Data to sign
 * @param ethAddr - Base 16 ETH address
 * @returns Base 16 signature
 */
export const ethereumSign = async (bytes: Uint8Array | number[], ethAddr: string) => {
  // Create args, fix arrays/buffers
  const args = { params: [[...bytes], ethAddr] }

  // Returns signature in hex format
  return await ethRequest('personal_sign', args) as string
}
