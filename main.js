import { RealDAOHelper } from './realdao-helper.js'
import config from './config.js'
import { Overview } from './components/overview.js'

function main() {
  const env = 'dev'
  const network = config.networks[env]
  const realDAO = new RealDAOHelper({
    Web3,
    env,
    config: network,
  })

  async function init() {
    await realDAO.loadOrchestrator()

    const overview = new Overview({ el: '#app', realDAO, config: network })

    overview.run()
  }

  init()
}

window.onload = main
