import VueModule from '../vue-module.js'

const ACCOUNT_CHANGE_EVENT = 'accountChanged'

export default class Topbar extends VueModule {
  constructor(options) {
    super()
    this.config = options.config
    this.service = options.service
    this.eb = options.eb

    this.model = {
      walletInstalled: false,
      walletButtonText: '',
      loginAccount: null,
      loaded: false,
      liquidity: 0,
      overview: {},
    }
    this.methods = {
      login: this.login.bind(this),
    }
    this.computed = {
      ellipsisAccount() {
        if (!this.loginAccount) return ''
        const len = this.loginAccount.length
        return this.loginAccount.slice(0, 8) + '...' + this.loginAccount.slice(len - 6, len)
      },
      accountUrl() {
        if (!this.loginAccount) return ''
        return `https://${options.config.explorer}/address/${this.loginAccount}`
      },
    }

    this.lastRefreshTime = 0
    this.refreshInterval = this.config.refreshInterval
    this.eb.on('overviewLoaded', this.setOverviewData.bind(this))

    this.walletFirstChecked = false
    const checkWallet = this._checkWallet.bind(this)
    this.service.wallet.onAccountChanged(checkWallet)
    this.service.wallet.onChainChanged(checkWallet)
  }

  setOverviewData(overview) {
    this.model.overview = overview
    this.model.loaded = true
  }

  login() {
    const wallet = this.service.wallet
    wallet
      .connect()
      .then(() => {
        this._checkWallet()
      })
      .catch((err) => {
        alert('Wallet Connect Error:' + err)
      })
  }

  _showWalletButton(text) {
    logger.debug('wallet button text', text)
    this.model.walletButtonText = text
    this.model.loginAccount = null
  }

  _checkWallet() {
    this.walletFirstChecked = true
    const wallet = this.service.wallet
    if (!wallet.isInstalled()) {
      this.model.walletInstalled = false
      return
    }
    this.model.walletInstalled = true

    if (!wallet.isConnected()) {
      return this._showWalletButton('Login')
    }
    if (wallet.getChainId() !== this.service.realdao.chainId()) {
      M.toast({ html: 'Wrong Network!', classes: 'rounded' })
      return this._showWalletButton('Wrong Network')
    }
    wallet
      .getDefaultAccount()
      .then((account) => {
        logger.debug('selectAccount:', account)
        if (account) {
          this.model.loginAccount = account

          const provider = this.service.wallet.currentProvider()
          this.service.realdao.setProvider(provider)
          this.eb.emit(ACCOUNT_CHANGE_EVENT, account)
          this._refresh(true)
        } else {
          this._showWalletButton('Login')
        }
      })
      .catch((err) => {
        // logger.debug('failed to get account:', err)
        M.toast({ html: 'Failed to get account', classes: 'rounded' })
        this._showWalletButton('Account Not Found')
      })
  }

  async _refresh(force) {
    if (!this.walletFirstChecked) {
      this._checkWallet()
    }
    if (!force && Date.now() - this.lastRefreshTime < this.refreshInterval) {
      return
    }
    this.lastRefreshTime = Date.now()
    if (!this.model.loginAccount) return
    const realdao = this.service.realdao
    const result = await realdao.getAccountLiquidity(this.model.loginAccount)
    this.model.liquidity = result.shortfall < 0 ? result.shortfallLiteral : result.liquidityLiteral
  }
}
