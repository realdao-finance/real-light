import { literalToReal } from '/lib/utils.js'
import VueModule from '../vue-module.js'

const OVERVIEW_LOADED_EVENT = 'overviewLoaded'

export default class Overview extends VueModule {
  constructor(options) {
    super()
    this.config = options.config
    this.service = options.service
    this.eb = options.eb

    this.model = {
      markets: [],
      balances: null,
      loginAccount: null,
      loaded: false,
      selectedIndex: 0,
      selectedSymbol: '...',
      needApprove: false,
      inputSupplyAmount: '0',
      inputBorrowAmount: '0',
      inputRedeemAmount: '0',
      inputRepayAmount: '0',
      tabs: null,
    }
    this.methods = {
      selectMarket: this.selectMarket.bind(this),
      doSupply: this.doSupply.bind(this),
      doBorrow: this.doBorrow.bind(this),
      doRedeem: this.doRedeem.bind(this),
      doRepay: this.doRepay.bind(this),
      doApprove: this.doApprove.bind(this),
    }
    this.lastRefreshOverViewTime = 0
    this.lastRefreshBalancesTime = 0

    this.refreshInterval = this.config.refreshInterval
  }

  async initialize() {
    this.eb.on('accountChanged', this.setLoginAccount.bind(this))
  }

  run() {
    this._refresh()
  }

  setLoginAccount(account) {
    const old = this.model.loginAccount
    this.model.loginAccount = account
    if (old !== account) {
      this._refreshBalances(true)
    }
  }

  selectMarket(index) {
    if (this.model.markets.length > 0) {
      this.model.selectedSymbol = this.model.markets[index].underlyingSymbol
    }
    this.model.selectedIndex = index
    this._checkAllowance()
  }

  async doSupply() {
    if (!this.model.loginAccount) return
    const market = this.model.markets[this.model.selectedIndex]
    if (!market) return

    const inputAmount = Number(this.model.inputSupplyAmount)
    if (Number.isNaN(inputAmount) || inputAmount <= 0) return

    const { underlyingDecimals, underlyingSymbol } = market
    const realAmount = literalToReal(inputAmount, underlyingDecimals)

    await this.service.realdao.loadRTokens()
    const contract = this.service.realdao.rToken(underlyingSymbol)
    if (underlyingSymbol === 'ETH') {
      await contract.mint().send({ value: realAmount, from: this.model.loginAccount })
    } else {
      await contract.mint(realAmount).send({ from: this.model.loginAccount })
    }
  }

  async doBorrow() {
    if (!this.model.loginAccount) return
    const market = this.model.markets[this.model.selectedIndex]
    if (!market) return

    const inputAmount = Number(this.model.inputBorrowAmount)
    if (Number.isNaN(inputAmount) || inputAmount <= 0) return

    const { underlyingDecimals, underlyingSymbol } = market
    const realAmount = literalToReal(inputAmount, underlyingDecimals)

    await this.service.realdao.loadRTokens()
    const contract = this.service.realdao.rToken(underlyingSymbol)
    await contract.borrow(realAmount).send({ from: this.model.loginAccount })
  }

  async doRedeem() {
    if (!this.model.loginAccount) return
    const market = this.model.markets[this.model.selectedIndex]
    if (!market) return

    const inputAmount = Number(this.model.inputRedeemAmount)
    if (Number.isNaN(inputAmount) || inputAmount <= 0) return

    const { underlyingSymbol } = market
    const rTokenDecimals = 8
    const realAmount = literalToReal(inputAmount, rTokenDecimals)

    await this.service.realdao.loadRTokens()
    const contract = this.service.realdao.rToken(underlyingSymbol)
    await contract.redeem(realAmount).send({ from: this.model.loginAccount })
  }

  async doRepay() {
    if (!this.model.loginAccount) return
    const market = this.model.markets[this.model.selectedIndex]
    if (!market) return

    const inputAmount = Number(this.model.inputRepayAmount)
    if (Number.isNaN(inputAmount) || inputAmount <= 0) return

    const { underlyingDecimals, underlyingSymbol } = market
    const realAmount = literalToReal(inputAmount, underlyingDecimals)

    await this.service.realdao.loadRTokens()
    const contract = this.service.realdao.rToken(underlyingSymbol)
    if (underlyingSymbol === 'ETH') {
      await contract.repayBorrow().send({ value: realAmount, from: this.model.loginAccount })
    } else {
      await contract.repayBorrow(realAmount).send({ from: this.model.loginAccount })
    }
  }

  async doApprove() {
    if (!this.model.loginAccount) return
    const market = this.model.markets[this.model.selectedIndex]
    if (!market) return

    const { underlyingAssetAddress, rToken } = market
    await this.service.realdao.approve(underlyingAssetAddress, rToken, this.model.loginAccount)
  }

  async _refresh() {
    this._refreshOverview()
    this._refreshBalances()
  }

  async _refreshOverview() {
    if (Date.now() - this.lastRefreshOverViewTime < this.refreshInterval) {
      return
    }
    console.log('refresh overview module')
    this.lastRefreshOverViewTime = Date.now()
    const realdao = this.service.realdao
    const overview = await realdao.getOverview()
    logger.debug('overview:', overview)
    this.model.markets = overview.markets
    this.selectMarket(this.model.selectedIndex)
    this.model.loaded = true
    this.eb.emit(OVERVIEW_LOADED_EVENT, overview)
    if (!this.model.tabs) {
      setTimeout(() => {
        this.initTabs()
      }, 10)
    }
  }

  initTabs() {
    let tabs = document.getElementById('tabs')
    let tabInstance = M.Tabs.init(tabs, {})
    this.model.tabs = tabInstance
  }

  async _refreshBalances(force) {
    if (!this.model.loginAccount) return
    if (!force && Date.now() - this.lastRefreshBalancesTime < this.config.refreshInterval) {
      return
    }
    this.lastRefreshBalancesTime = Date.now()
    logger.debug('refreshBalances:', this.model.loginAccount)
    const realdao = this.service.realdao
    const result = await realdao.getAccountBalances(this.model.loginAccount)
    logger.debug('getAccountBalances:', result)
    const balances = {}
    for (const item of result.sheets) {
      const symbol = 'r' + item.underlyingSymbol
      balances[symbol] = item
    }
    this.model.balances = balances
  }

  async _checkAllowance() {
    if (this.model.selectedSymbol === 'ETH' || !this.model.loginAccount) {
      this.model.needApprove = false
      return
    }
    const market = this.model.markets[this.model.selectedIndex]
    const underlyingAddr = market.underlyingAssetAddress
    const marketAddr = market.rToken
    this.model.needApprove = await this.service.realdao.needApprove(underlyingAddr, marketAddr, this.model.loginAccount)
  }
}
