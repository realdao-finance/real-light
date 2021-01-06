import { EventEmitter } from '../lib/event-emitter.js'
import { parseQuery } from '../lib/parser.js'
import { loadServices, loadModules } from '../lib/loader.js'
import { getConfig } from '../configs/index.js'

async function main() {
  const query = parseQuery(window.location.search)
  const env = query.env || 'test'
  const config = await getConfig(env)
  config.env = env
  console.log('config:', config)

  const service = await loadServices(['../services/realdao.js', '../services/wallet.js'], { config })

  const eb = new EventEmitter()
  const options = { config, service, eb }
  await loadModules(['../modules/header.js', '../modules/overview.js', '../modules/mining.js'], options)
}

window.onload = main
