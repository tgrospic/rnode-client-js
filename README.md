# RNode Web API client examples

See also recording of code walk-thru sessions:
 - [2020\-07\-28 RChain Education](https://youtu.be/5JEtt53EacI?t=1043)
 - [2020\-08\-25 RChain Education](https://www.youtube.com/watch?v=2EUd2vOiJX8)

In the browser connection to RNode can be done with **RNode Web API**.
Web API has only defined schema in Scala source, for the new info please check [RChain issue 2974](https://github.com/rchain/rchain/issues/2974).

For gRPC connection from nodejs please check [**@tgrospic/rnode-grpc-js**](https://github.com/tgrospic/rnode-grpc-js).

<details>
<summary>Quick info to run the example with two nodes</summary>

```sh
# Run nodes and web page example
npm install && docker-compose up -d && npm start

# Logs from both nodes
docker-compose logs -f
```
</details>

Web example is published from `gh-pages` branch to this url [https://tgrospic.github.io/rnode-client-js](https://tgrospic.github.io/rnode-client-js).

**Changes on the web page are only saved in memory so it will be lost after refreshing the page.**

## Wallet example with connection to RNode and Metamask (with hardware wallet)

RNode has support for Ethereum type of signatures so Metamask can be used for signing deploys e.g. making transfers of REVs. In Web example, button to add selected Metamask account should be visible next to REV import textbox.

Helper functions are in [@tgrospic/rnode-http-js] which contains the code for communication with Metamask, getting selected ETH address and sending deploys for signing.

RChain networks available for selection are in [rchain-networks.js](src/rchain-networks.js) file.

[@tgrospic/rnode-http-js]: https://github.com/tgrospic/rnode-http-js

## Install

Install project dependencies (in `./node_modules` folder).

```sh
npm install
```

## Run

This will start local Nodejs dev server in watch mode [http://localhost:1234](http://localhost:1234).

Test page contains a list of nodes to select, check balance, send transfers and deploys.

```sh
npm start
```

## Run RNode with Docker

In the project is [Docker compose](docker-compose.yml) configuration to run local RChain network.
Private key for the validator is in [.env](.env) file. This key is also set in [data/genesis/wallets.txt](data/genesis/wallets.txt) witj initial REV balance to play with.

```sh
# Starts validator and read-only RNode in daemon mode
docker-compose up -d

# Logs from all nodes
docker-compose logs -f
```

## Build static page (offline mode)

Web site can be compiled to static page which can be opened with double click on `index.html` in `./dist` directory where the page is built. This is exactly what we need for offline wallet. :)

Because it's a static page it can be published directly on Github via `gh-pages` branch which contains compiled files from `./dist` directory. It is visible on this url [https://tgrospic.github.io/rnode-client-js](https://tgrospic.github.io/rnode-client-js). If you fork this repo you can do this with you own version of app.  
With [GitHub pages action](.github/workflows/github-pages.yml) any commit to _master_ branch will rebuild and publish the page. Locally the page can be generated with _build_ command.

```sh
# Compile static web site (to ./dist folder)
npm run build
```
