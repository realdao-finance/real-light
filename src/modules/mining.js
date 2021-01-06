export default class Mining {
  constructor(options) {
    this.config = options.config
    this.service = options.service
    this.eb = options.eb
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
  }

  async initialize() {
    this.eb.on('accountChanged', this.setLoginAccount.bind(this))
  }

  setLoginAccount(account) {
    const old = this.vm.loginAccount
    this.vm.loginAccount = account
    if (old !== account) {
      this._refresh()
    }
  }

  run() {
    const refresh = this._refresh.bind(this)

    // This is to wait for loginAccount
    setTimeout(refresh, 1000)
    setInterval(refresh, this.config.refreshInterval)
  }

  async _refresh() {
    if (Date.now() - this.lastRefreshTime < this.config.refreshInterval) {
      return
    }
    this.lastRefreshTime = Date.now()

    const realdao = this.service.realdao
    console.log('loginAccount:', this.vm.loginAccount)
    const miningInfo = await realdao.getPools(this.vm.loginAccount)
    console.log('miningInfo:', miningInfo)
    this.vm.pools = miningInfo.pools
    this.vm.my = miningInfo.my

    this.vm.loaded = true
  }
}
