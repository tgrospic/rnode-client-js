# RNode JS client samples for Nodejs and browser

This repo contains samples how to use [@tgrospic/rnode-grpc-js](https://www.npmjs.com/package/@tgrospic/rnode-grpc-js) helper library to generate JS bindings for RNode (in Nodejs and browser).

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
## Run **Nodejs example** ([`src/nodejs`](src/nodejs))

In `src/nodejs` folder is an example of how to connect to RNode from Nodejs.

```sh
# Run nodejs example / sample requests to testnet/devnet/sandboxnet validator
npm run start-nodejs
```
## Run **Web example** / connect to RNode from the browser ([`src/web`](src/web))

This will start local nodejs dev server in watch mode [http://localhost:1234](http://localhost:1234).

On page load it will make some sample requests to RNode and print outputs. This is very simle example, just text, no UI. :)

 The code for Nodejs is almost the same as for the browser, the main difference is how _client_ is constructed. Nodejs uses generated _protocol_ files with `..._grpc_pb.js` suffix and browser with `..._grpc_web_pb.js` suffix. Files with just `..._pb.js` have defined types and they are common for both platforms.

```sh
# Run web example / sample request to Envoy proxy
# - proxy is available for testnet/devnet/sandboxnet
npm run start-web
```
Web site can be compiled to static page which can be opened with double click on `index.html` in `./dist` directory where the page is built. This is exactly what we need for offline wallet. :)

```sh
# Compile static web site (to ./dist folder)
npm run build-web
```
