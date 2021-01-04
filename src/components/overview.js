import { EventProxy } from '../lib/event-proxy.js'

const OVERVIEW_LOADED_EVENT = 'overviewLoaded'

export class Overview {
  constructor(options) {
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
    this.ep = new EventProxy()
    this.options = options
  }

  async run() {
    const refresh = this._refresh.bind(this)

    refresh()
    setInterval(refresh, this.options.minRefreshInterval)
  }

  onOverviewLoaded(handler) {
    this.ep.on(OVERVIEW_LOADED_EVENT, handler)
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
    if (Date.now() - this.lastRefreshOverViewTime < this.options.minRefreshInterval) {
      return
    }
    this.lastRefreshOverViewTime = Date.now()
    const realDAO = this.options.realDAO
    const overview = await realDAO.getOverview()
    console.log('overview:', overview)
    this.vm.markets = overview.markets
    this.vm.loaded = true
    this.ep.emit(OVERVIEW_LOADED_EVENT, overview)
  }

  async _refreshBalances() {
    if (!this.vm.loginAccount) return
    if (Date.now() - this.lastRefreshBalancesTime < this.options.minRefreshInterval) {
      return
    }
    this.lastRefreshBalancesTime = Date.now()
    console.log('refreshBalances:', this.vm.loginAccount)
    const realDAO = this.options.realDAO
    const result = await realDAO.getAccountBalances(this.vm.loginAccount)
    console.log('getAccountBalances:', result)
    const balances = {}
    for (const item of result.sheets) {
      const symbol = 'r' + item.underlyingSymbol
      balances[symbol] = item
    }
    this.vm.balances = balances
  }
}
