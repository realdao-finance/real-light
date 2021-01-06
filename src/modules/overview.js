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
    console.log('overview:', overview)
    this.vm.markets = overview.markets
    this.vm.loaded = true
    this.eb.emit(OVERVIEW_LOADED_EVENT, overview)
  }

  async _refreshBalances() {
    if (!this.vm.loginAccount) return
    if (Date.now() - this.lastRefreshBalancesTime < this.config.refreshInterval) {
      return
    }
    this.lastRefreshBalancesTime = Date.now()
    console.log('refreshBalances:', this.vm.loginAccount)
    const realdao = this.service.realdao
    const result = await realdao.getAccountBalances(this.vm.loginAccount)
    console.log('getAccountBalances:', result)
    const balances = {}
    for (const item of result.sheets) {
      const symbol = 'r' + item.underlyingSymbol
      balances[symbol] = item
    }
    this.vm.balances = balances
  }
}
