import { realToLiteral } from '../lib/utils.js'

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
        selectedIndex: 2,
        selectedLPToken: '...',
        needApprove: false,
        lpBalance: '0',
      },
      methods: {
        selectPool: this.selectPool.bind(this),
      },
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

  selectPool(index) {
    const pool = this.vm.pools[index]
    if (pool && pool.ptype === 2) {
      this.vm.selectedLPToken = pool.title
      this.vm.selectedIndex = index
      this._checkAllowance()
    }
  }

  async _checkAllowance() {
    const pool = this.vm.pools[this.vm.selectedIndex]
    if (!pool || !this.vm.loginAccount) {
      this.vm.needApprove = false
      return
    }
    const tokenAddr = pool.tokenAddr
    const distributorAddr = await this.service.realdao.getDistributorAddress()
    this.vm.needApprove = await this.service.realdao.needApprove(tokenAddr, distributorAddr, this.vm.loginAccount)
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

    this.selectPool(this.vm.selectedIndex)
    this.vm.loaded = true

    this._refreshLPBalance()
  }

  async _refreshLPBalance() {
    if (!this.vm.loginAccount) return
    const pool = this.vm.pools[this.vm.selectedIndex]
    if (!pool || pool.ptype !== 2) return

    const { tokenAddr } = pool
    const contract = this.service.realdao.erc20Token(tokenAddr)
    const results = await Promise.all([contract.balanceOf(this.vm.loginAccount).call(), contract.decimals().call()])
    const balance = realToLiteral(results[0], results[1])
    this.vm.lpBalance = balance
  }
}
