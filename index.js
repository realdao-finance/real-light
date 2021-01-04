import { RealDAOHelper } from './realdao-helper.js'
import config from './config.js'
import { Overview } from './components/overview.js'
import { Mining } from './components/mining.js'

function main() {
  const env = 'test'
  const network = config.networks[env]
  const realDAO = new RealDAOHelper({
    Web3,
    env,
    config: network,
  })

  async function init() {
    await realDAO.loadOrchestrator()

    const overview = new Overview({ el: '#overview', realDAO, config: network })
    const mining = new Mining({ el: '#mining', realDAO })

    overview.run()
    mining.run()
  }

  init()
}

window.onload = main
