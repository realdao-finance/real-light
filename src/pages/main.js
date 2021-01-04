import { RealDAOHelper } from '../lib/realdao-helper.js'
import config from '../config.js'
import { Overview } from '../components/overview.js'
import { Mining } from '../components/mining.js'
import { Account } from '../components/account.js'
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

    const overview = new Overview({ realDAO, config: network, mode: mode })
    const mining = new Mining({ realDAO, mode: mode })
    const account = new Account({ realDAO })
    // const unsubscribe = mode.subscribe((v) => console.log(v, '==========='))

    overview.onAccountChanged((addr) => {
      account.setAddress(addr)
      mining.setAddress(addr)
    })

    overview.run()
    mining.run()
  }

  init()
}

window.onload = main
