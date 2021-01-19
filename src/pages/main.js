import { EventEmitter } from '../lib/event-emitter.js'
import { loadServices, loadModules } from '../lib/loader.js'
import { createLogger } from '../lib/logger.js'
import { toFixed, toFixedPercent } from '../lib/utils.js'
import { getConfig } from '../configs/index.js'

export async function main(argv) {
  argv = argv || []
  const config = await getConfig()
  window.logger = createLogger({ level: config.logLevel })

  logger.debug('config:', config)

  Vue.filter('toFixed', toFixed)
  Vue.filter('toFixedPercent', toFixedPercent)

  const serviceFiles = argv[0] || []
  const moduleDirs = argv[1] || []

  const service = await loadServices(serviceFiles, { config })
  const eb = new EventEmitter()
  const options = { config, service, eb }

  const routes = []
  const modules = await loadModules(moduleDirs, options, routes)
  new Vue({
    el: '#app',
    router: new VueRouter({ routes }),
  })
  for (const mod of modules) {
    mod.run()
  }
}
