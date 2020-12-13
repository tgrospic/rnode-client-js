// Web example with REV transfer and balance check
import { makeRNodeWeb } from '@tgrospic/rnode-http-js'
import { makeRNodeActions } from './rnode-actions'
import { pageLog } from './controls/common'
import { startApp } from './controls/main-ctrl'

// DOM global functions / dependencies
const { log: logOrig, warn } = console
const { fetch, document } = window

// Page printer mirrors the console `log`
const log = pageLog({log: logOrig, document})

// Make RNode web API client / wrapped around DOM fetch
const rnodeWeb = makeRNodeWeb({fetch, now: Date.now})

// Make application actions as a wrapper around RNode API
const appNodeEff = makeRNodeActions(rnodeWeb, {log, warn})

// Attach to window load event (to refresh on duplicated tab)
window.addEventListener('load', () => {
  // Application root element
  const appRoot = document.querySelector('#app') as Element

  // Start main app / supply effects
  startApp(appRoot, {...appNodeEff, log, warn})
})
