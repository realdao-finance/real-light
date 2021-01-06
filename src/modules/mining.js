export class Mining {
  constructor(options) {
    this.vm = new Vue({
      el: '#mining',
      data: {
        pools: [],
        my: [],
        loginAccount: null,
        loaded: false,
      },
      methods: {},
      computed: {},
    })
    this.lastRefreshTime = 0
    this.options = options
  }

  setLoginAccount(account) {
    const old = this.vm.loginAccount
    this.vm.loginAccount = account
    if (old !== account) {
      this._refresh()
    }
  }

  async run() {
    const refresh = this._refresh.bind(this)

    // This is to wait for loginAccount
    setTimeout(refresh, 1000)
    setInterval(refresh, this.options.minRefreshInterval)
  }

  async _refresh() {
    if (Date.now() - this.lastRefreshTime < this.options.minRefreshInterval) {
      return
    }
    this.lastRefreshTime = Date.now()

    const realDAO = this.options.realDAO
    console.log('loginAccount:', this.vm.loginAccount)
    const miningInfo = await realDAO.getPools(this.vm.loginAccount)
    console.log('miningInfo:', miningInfo)
    this.vm.pools = miningInfo.pools
    this.vm.my = miningInfo.my

    this.vm.loaded = true
  }
}
