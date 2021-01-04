import { RealDAOHelper } from '../lib/realdao-helper.js'
import config from '../config.js'
import { Overview } from '../components/overview.js'
import { Mining } from '../components/mining.js'
const { mode } = window.__pdm__

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

    const minRefreshInterval = 10000
    const overview = new Overview({ realDAO, config: network, mode, minRefreshInterval })
    const mining = new Mining({ realDAO, minRefreshInterval })
    // const unsubscribe = mode.subscribe((v) => console.log(v, '==========='))

    overview.onAccountChanged((addr) => {
      mining.setLoginAccount(addr)
    })

    overview.run()
    mining.run()
  }

  init()
}

window.onload = main
