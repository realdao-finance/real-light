import { RealDAOService } from '../services/realdao-service.js'
import { WalletService } from '../services/wallet-service.js'
import { getConfig } from '../configs/index.js'
import { Overview } from '../modules/overview.js'
import { Mining } from '../modules/mining.js'
import { Header } from '../modules/header.js'

async function main() {
  const env = 'test'
  const config = await getConfig(env)
  console.log('config:', config)
  const realDAO = new RealDAOService({
    Web3,
    env,
    network: config.network,
  })
  const wallet = new WalletService()

  await realDAO.initialize()
  await wallet.initialize()

  const service = { realDAO, wallet }
  const options = { config, service }
  const header = new Header(options)
  const overview = new Overview(options)
  const mining = new Mining(options)

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

window.onload = main
