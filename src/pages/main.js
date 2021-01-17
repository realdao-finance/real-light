import { EventEmitter } from '../lib/event-emitter.js'
import { loadServices, loadModules } from '../lib/loader.js'
import { createLogger } from '../lib/logger.js'
import { getConfig } from '../configs/index.js'

// prettier-ignore
const serviceFiles = [
  '../services/realdao.js',
  '../services/wallet.js'
]

// prettier-ignore
const moduleFiles = [
  '../modules/header.js',
  '../modules/overview.js',
  '../modules/mining.js',
]

async function main() {
  const config = await getConfig()
  window.logger = createLogger({ level: config.logLevel })

  logger.debug('config:', config)

  const service = await loadServices(serviceFiles, { config })
  const eb = new EventEmitter()
  const options = { config, service, eb }
  await loadModules(moduleFiles, options)
  M.AutoInit()
}

window.onload = main
