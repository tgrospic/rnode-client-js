const defaultPorts = { grpc: 40401, http: 40403 }
const defaultPortsSSL = { grpc: 40401, https: 443 }

// Local network

export const localNet = {
  title: 'Local network',
  name: 'localnet',
  hosts: [
    { domain: 'localhost', ...defaultPorts, grpcProxy: 'http://localhost:44402' },
    { domain: 'localhost', grpc: 50401, http: 50403, grpcInternal: 50402 },
  ],
  readOnlys: [
    { domain: 'localhost', grpc: 50401, http: 50403 },
  ]
}

// Test network

const range = n => [...Array(n).keys()]

const getUrlsNoSSL = net => n => ({
  domain   : `node${n}.${net}.rchain-dev.tk`,
  grpcProxy: `https://${net}-${n}.grpc.rchain.isotypic.com`,
  ...defaultPorts,
})

const getUrls = net => n => ({
  domain   : `node${n}.${net}.rchain-dev.tk`,
  grpcProxy: `https://${net}-${n}.grpc.rchain.isotypic.com`,
  ...defaultPortsSSL,
})

const testnetHostsNoSSL = range(5).map(getUrlsNoSSL('testnet'))
const testnetHosts      = range(5).map(getUrls('testnet'))

export const testNet = {
  title: 'RChain testing network',
  name: 'testnet',
  // hosts: [...testnetHostsNoSSL, ...testnetHosts],
  hosts: testnetHosts,
  readOnlys: [
    // { domain: 'observer.testnet.rchain.coop', ...defaultPorts },
    { domain: 'observer.testnet.rchain.coop', ...defaultPortsSSL },
    { domain: '34.69.245.142', ...defaultPorts },
    // Jim's read-only node
    { domain: 'rnode1.rhobot.net', ...defaultPorts },
  ],
}

// MAIN network

export const mainNet = {
  title: 'RChain MAIN network',
  name: 'mainnet',
  hosts: [
    { domain: 'node0.root-shard.mainnet.rchain.coop', ...defaultPortsSSL },
    { domain: 'node1.root-shard.mainnet.rchain.coop', ...defaultPortsSSL },
    { domain: 'node2.root-shard.mainnet.rchain.coop', ...defaultPortsSSL },
    { domain: 'node3.root-shard.mainnet.rchain.coop', ...defaultPortsSSL },
    { domain: 'node4.root-shard.mainnet.rchain.coop', ...defaultPortsSSL },
    { domain: 'node5.root-shard.mainnet.rchain.coop', ...defaultPortsSSL },
    { domain: 'node6.root-shard.mainnet.rchain.coop', ...defaultPortsSSL },
    { domain: 'node7.root-shard.mainnet.rchain.coop', ...defaultPortsSSL },
    { domain: 'node8.root-shard.mainnet.rchain.coop', ...defaultPortsSSL },
    // Theo's node doesn't expose http api
    // { domain: '77.81.6.137', ...defaultPorts },
    // DIRECT IPs (until SSL is configured)
    { domain: '35.189.203.83', ...defaultPorts },
    { domain: '34.76.146.225', ...defaultPorts },
    { domain: '35.195.88.187', ...defaultPorts },
    { domain: '35.190.222.161', ...defaultPorts },
    { domain: '35.205.181.71', ...defaultPorts },
    { domain: '34.77.43.236', ...defaultPorts },
    { domain: '35.187.0.49', ...defaultPorts },
    { domain: '34.77.204.43', ...defaultPorts },
    { domain: '34.76.192.90', ...defaultPorts },
  ],
  readOnlys: [
    { domain: 'observer.services.mainnet.rchain.coop', https: 443 },
    { domain: 'observer-us.services.mainnet.rchain.coop', ...defaultPortsSSL },
    { domain: 'observer-asia.services.mainnet.rchain.coop', ...defaultPortsSSL },
    { domain: 'observer-eu.services.mainnet.rchain.coop', ...defaultPortsSSL },
    // DIRECT IPs (until SSL is configured)
    { domain: '35.225.231.18', ...defaultPorts },
    { domain: '35.220.140.14', ...defaultPorts },
    { domain: '35.234.124.72', ...defaultPorts },
  ],
}

export const getNodeUrls = ({name, domain, grpc, http, https, grpcInternal, grpcProxy}) => {
  const scheme  = !!https ? 'https' : !!http ? 'http' : ''
  const httpUrl = !!https || !!http ? `${scheme}://${domain}:${https || http}` : void 8
  const grpcUrl = !!grpc ? `${domain}:${grpc}` : void 8
  return {
    network     : name,
    grpcUrl,
    httpUrl,
    internalUrl : `${domain}:${grpcInternal}`,
    grpcProxyUrl: grpcProxy,
    statusUrl   : `${httpUrl}/status`,
    // Testnet only
    logsUrl     : `http://${domain}:8181/logs/name:rnode`,
    filesUrl    : `http://${domain}:18080`,
  }
}
