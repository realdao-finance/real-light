export default class WalletService {
  async initialize() {}

  currentProvider() {
    logger.debug('currentProvider:', window.ethereum)
    return window.ethereum
  }

  isInstalled() {
    return !!window.ethereum
  }

  isConnected() {
    return window.ethereum.isConnected()
  }

  connect() {
    return window.ethereum.request({ method: 'eth_requestAccounts' })
  }

  getDefaultAccount() {
    return window.ethereum.request({ method: 'eth_accounts' }).then((accounts) => {
      if (accounts[0]) this.loginAccount = accounts[0]
      return accounts[0]
    })
  }

  getChainId() {
    return Number(window.ethereum.chainId)
  }

  onAccountChanged(handler) {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', handler)
    }
  }

  onChainChanged(handler) {
    if (window.ethereum) {
      window.ethereum.on('chainChanged', (chainId) => {
        logger.debug('chainChanged:', chainId)
        handler()
      })
    }
  }
}
