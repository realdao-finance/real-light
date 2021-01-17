import { literalToReal } from '../lib/utils.js'

const OVERVIEW_LOADED_EVENT = 'overviewLoaded'

export default class Overview {
  constructor(options) {
    this.config = options.config
    this.service = options.service
    this.eb = options.eb

    this.vm = new Vue({
      el: '#overview',
      data: {
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
      },
      computed: {},
      methods: {
        selectMarket: this.selectMarket.bind(this),
        doSupply: this.doSupply.bind(this),
        doBorrow: this.doBorrow.bind(this),
        doRedeem: this.doRedeem.bind(this),
        doRepay: this.doRepay.bind(this),
        doApprove: this.doApprove.bind(this),
      },
      mounted() {
        // setTimeout(()=>{
        //   let tabs = document.getElementById('tabs')
        //   M.Tabs.init(tabs, {});
        // }, 2000)
        // this.$nextTick(() => {
        //    this.initTabs()
        // })
      },
    })
    this.lastRefreshOverViewTime = 0
    this.lastRefreshBalancesTime = 0
  }

  async initialize() {
    this.eb.on('accountChanged', this.setLoginAccount.bind(this))
  }

  run() {
    const refresh = this._refresh.bind(this)
    refresh()
    setInterval(refresh, this.config.refreshInterval)
  }

  setLoginAccount(account) {
    const old = this.vm.loginAccount
    this.vm.loginAccount = account
    if (old !== account) {
      this._refreshBalances()
    }
  }

  selectMarket(index) {
    if (this.vm.markets.length > 0) {
      this.vm.selectedSymbol = this.vm.markets[index].underlyingSymbol
    }
    this.vm.selectedIndex = index
    this._checkAllowance()
  }

  async doSupply() {
    if (!this.vm.loginAccount) return
    const market = this.vm.markets[this.vm.selectedIndex]
    if (!market) return

    const inputAmount = Number(this.vm.inputSupplyAmount)
    if (Number.isNaN(inputAmount) || inputAmount <= 0) return

    const { underlyingDecimals, underlyingSymbol } = market
    const realAmount = literalToReal(inputAmount, underlyingDecimals)

    await this.service.realdao.loadRTokens()
    const contract = this.service.realdao.rToken(underlyingSymbol)
    if (underlyingSymbol === 'ETH') {
      await contract.mint().send({ value: realAmount, from: this.vm.loginAccount })
    } else {
      await contract.mint(realAmount).send({ from: this.vm.loginAccount })
    }
  }

  async doBorrow() {
    if (!this.vm.loginAccount) return
    const market = this.vm.markets[this.vm.selectedIndex]
    if (!market) return

    const inputAmount = Number(this.vm.inputBorrowAmount)
    if (Number.isNaN(inputAmount) || inputAmount <= 0) return

    const { underlyingDecimals, underlyingSymbol } = market
    const realAmount = literalToReal(inputAmount, underlyingDecimals)

    await this.service.realdao.loadRTokens()
    const contract = this.service.realdao.rToken(underlyingSymbol)
    await contract.borrow(realAmount).send({ from: this.vm.loginAccount })
  }

  async doRedeem() {
    if (!this.vm.loginAccount) return
    const market = this.vm.markets[this.vm.selectedIndex]
    if (!market) return

    const inputAmount = Number(this.vm.inputRedeemAmount)
    if (Number.isNaN(inputAmount) || inputAmount <= 0) return

    const { underlyingSymbol } = market
    const rTokenDecimals = 8
    const realAmount = literalToReal(inputAmount, rTokenDecimals)

    await this.service.realdao.loadRTokens()
    const contract = this.service.realdao.rToken(underlyingSymbol)
    await contract.redeem(realAmount).send({ from: this.vm.loginAccount })
  }

  async doRepay() {
    if (!this.vm.loginAccount) return
    const market = this.vm.markets[this.vm.selectedIndex]
    if (!market) return

    const inputAmount = Number(this.vm.inputRepayAmount)
    if (Number.isNaN(inputAmount) || inputAmount <= 0) return

    const { underlyingDecimals, underlyingSymbol } = market
    const realAmount = literalToReal(inputAmount, underlyingDecimals)

    await this.service.realdao.loadRTokens()
    const contract = this.service.realdao.rToken(underlyingSymbol)
    if (underlyingSymbol === 'ETH') {
      await contract.repayBorrow().send({ value: realAmount, from: this.vm.loginAccount })
    } else {
      await contract.repayBorrow(realAmount).send({ from: this.vm.loginAccount })
    }
  }

  async doApprove() {
    if (!this.vm.loginAccount) return
    const market = this.vm.markets[this.vm.selectedIndex]
    if (!market) return

    const { underlyingAssetAddress, rToken } = market
    await this.service.realdao.approve(underlyingAssetAddress, rToken, this.vm.loginAccount)
  }

  async _refresh() {
    this._refreshOverview()
    this._refreshBalances()
  }

  async _refreshOverview() {
    if (Date.now() - this.lastRefreshOverViewTime < this.config.refreshInterval) {
      return
    }
    this.lastRefreshOverViewTime = Date.now()
    const realdao = this.service.realdao
    const overview = await realdao.getOverview()
    logger.debug('overview:', overview)
    this.vm.markets = overview.markets
    this.selectMarket(this.vm.selectedIndex)
    this.vm.loaded = true
    this.eb.emit(OVERVIEW_LOADED_EVENT, overview)
    if (!this.vm.tabs) {
      setTimeout(() => {
        this.initTabs()
      }, 1)
    }
  }

  initTabs() {
    let tabs = document.getElementById('tabs')
    let tabInstance = M.Tabs.init(tabs, {})
    this.vm.tabs = tabInstance
  }

  async _refreshBalances() {
    if (!this.vm.loginAccount) return
    if (Date.now() - this.lastRefreshBalancesTime < this.config.refreshInterval) {
      return
    }
    this.lastRefreshBalancesTime = Date.now()
    logger.debug('refreshBalances:', this.vm.loginAccount)
    const realdao = this.service.realdao
    const result = await realdao.getAccountBalances(this.vm.loginAccount)
    logger.debug('getAccountBalances:', result)
    const balances = {}
    for (const item of result.sheets) {
      const symbol = 'r' + item.underlyingSymbol
      balances[symbol] = item
    }
    this.vm.balances = balances
  }

  async _checkAllowance() {
    if (this.vm.selectedSymbol === 'ETH' || !this.vm.loginAccount) {
      this.vm.needApprove = false
      return
    }
    const market = this.vm.markets[this.vm.selectedIndex]
    const underlyingAddr = market.underlyingAssetAddress
    const marketAddr = market.rToken
    this.vm.needApprove = await this.service.realdao.needApprove(underlyingAddr, marketAddr, this.vm.loginAccount)
  }
}
