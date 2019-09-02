# RNode JS client examples for Nodejs and browser

This repo contains examples how to use [**@tgrospic/rnode-grpc-js**](https://github.com/tgrospic/rnode-grpc-js) helper library to generate **RNode API** for **Nodejs** and the **browser**. There you can find more information about API, how to install it and use it. 

Web example is published from `gh-pages` branch on this url [https://tgrospic.github.io/rnode-client-js](https://tgrospic.github.io/rnode-client-js).

## Install

Install project dependencies (in `./node_modules` folder).

```sh
npm install
```
Generate JS bindings (default in `./rnode-grpc-gen`).

```sh
# Defined as script command in package.json
npm run rnode-generate

# Or call executable script directly from npm bin folder
# - which is in the PATH when npm scripts are executed
node_modules/.bin/rnode-grpc
```
## Run **Nodejs example** ([`src/nodejs/client.js`](src/nodejs/client.js))

In `src/nodejs/client.js` script is an example of how to connect to RNode from Nodejs.

```sh
# Run nodejs example / sample requests to RChain testnet
npm run start-nodejs
```
## Run **Browser example** ([`src/web/index.js`](src/web/index.js))

This will start local Nodejs dev server in watch mode [http://localhost:1234](http://localhost:1234).

Test page contains a list of testnet validators with a button to make sample requests and print outputs.

The code for Nodejs is almost the same as for the browser, the main difference is how _client_ is constructed. Nodejs uses generated _protocol_ files with `..._grpc_pb.js` suffix and browser with `..._grpc_web_pb.js` suffix. Files with just `..._pb.js` have defined types and they are common for both platforms.

```sh
# Run web example / sample request to Envoy proxy
# - proxy is available for RChain testnet
npm run start-web
```
## Build static page (offline mode)

Web site can be compiled to static page which can be opened with double click on `index.html` in `./dist` directory where the page is built. This is exactly what we need for offline wallet. :)

Because it's a static page it can be published directly on Github via `gh-pages` branch which contains compiled files from `./dist` directory. It is visible on this url [https://tgrospic.github.io/rnode-client-js](https://tgrospic.github.io/rnode-client-js). If you fork this repo you can do this with you own version of app.

```sh
# Compile static web site (to ./dist folder)
npm run build-web
```

## TypeScript definitions

`rnode-grpc-js` library also generates a TypeScript definition file that can be referenced in your code and can provide IntelliSense support in VSCode.

```typescript
/// <reference path="../../rnode-grpc-gen/js/rnode-grps-js.d.ts" />
```

![](docs/intellisense-vscode.png)

## Available proxies for _testnet_

List of proxies to validators in RChain _testnet_ network.

#### Proxy address pattern:

gRPC `node{0-n}.NETWORK.rchain-dev.tk:40401`  
HTTP `https://NETWORK-{0-n}.grpc.rchain.isotypic.com`

### testnet

| gRPC                              | HTTP
|:---------------------------------:|:-----------------------------------------:
| node0.testnet.rchain-dev.tk:40401 | https://testnet-0.grpc.rchain.isotypic.com
| node1.testnet.rchain-dev.tk:40401 | https://testnet-1.grpc.rchain.isotypic.com
| node2.testnet.rchain-dev.tk:40401 | https://testnet-2.grpc.rchain.isotypic.com
| node3.testnet.rchain-dev.tk:40401 | https://testnet-3.grpc.rchain.isotypic.com
| node4.testnet.rchain-dev.tk:40401 | https://testnet-4.grpc.rchain.isotypic.com
| node5.testnet.rchain-dev.tk:40401 | https://testnet-5.grpc.rchain.isotypic.com
| node6.testnet.rchain-dev.tk:40401 | https://testnet-6.grpc.rchain.isotypic.com
| node7.testnet.rchain-dev.tk:40401 | https://testnet-7.grpc.rchain.isotypic.com
| node8.testnet.rchain-dev.tk:40401 | https://testnet-8.grpc.rchain.isotypic.com
| node9.testnet.rchain-dev.tk:40401 | https://testnet-9.grpc.rchain.isotypic.com
