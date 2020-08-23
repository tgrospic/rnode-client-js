// Web example with REV transfer and balance check
import { pageLog, handleHashHref } from './controls/common'
import { makeRNodeWeb } from '../rnode-web'
import { makeRNodeActions } from './rnode-actions'
import { startApp } from './controls/main-ctrl'

// DOM global functions / dependencies
const { log: logOrig, warn } = console
const { fetch } = window

// Prevents default redirect for link <a href="#">
handleHashHref(document.body)

// Page printer mirrors the console `log`
const log = pageLog({log: logOrig, document})

// Make RNode web API client / wrapped around DOM fetch
const rnodeWeb = makeRNodeWeb({fetch})

// Make application actions as a wrapper around RNode API
const appNodeEff = makeRNodeActions(rnodeWeb, {log, warn})

// Application root element
const appRoot = document.querySelector('#app')

// Start main app / supply effects
startApp(appRoot, {...appNodeEff, log, warn})
