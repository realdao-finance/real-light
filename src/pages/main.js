import { RealDAOHelper } from '../lib/realdao-helper.js'
import config from '../config.js'
import { Overview } from '../components/overview.js'
import { Mining } from '../components/mining.js'
import { Header } from '../components/header.js'
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
    const header = new Header({ config: network, mode })
    const overview = new Overview({ realDAO, minRefreshInterval })
    const mining = new Mining({ realDAO, minRefreshInterval })
    // const unsubscribe = mode.subscribe((v) => console.log(v, '==========='))

    header.onAccountChanged((account) => {
      mining.setLoginAccount(account)
      overview.setLoginAccount(account)
    })

    overview.onOverviewLoaded((overview) => {
      header.setOverviewData(overview)
    })

    header.run()
    overview.run()
    mining.run()
  }

  init()
}

window.onload = main
