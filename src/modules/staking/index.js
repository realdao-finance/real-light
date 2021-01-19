import { realToLiteral, literalToReal } from '/lib/utils.js'
import VueModule from '../vue-module.js'

export default class Staking extends VueModule {
  constructor(options) {
    super()
    this.config = options.config
    this.service = options.service
    this.eb = options.eb

    this.path = '/staking'
    this.model = {
      pools: [],
      my: [],
      loginAccount: null,
      loaded: false,
      selectedIndex: 2,
      selectedLPToken: '...',
      needApprove: false,
      lpBalance: '0',
      inputStakeAmount: '0',
    }
    this.methods = {
      selectPool: this.selectPool.bind(this),
      doApprove: this.doApprove.bind(this),
      doStake: this.doStake.bind(this),
    }
    this.lastRefreshTime = 0
    this.refreshInterval = this.config.refreshInterval
  }

  setLoginAccount(account) {
    const old = this.model.loginAccount
    this.model.loginAccount = account
    if (old !== account) {
      this._refresh(true)
    }
  }

  run() {
    this.eb.on('accountChanged', this.setLoginAccount.bind(this))
    this._refresh()
  }

  selectPool(index) {
    const pool = this.model.pools[index]
    if (pool && pool.ptype === 2) {
      this.model.selectedLPToken = pool.title
      this.model.selectedIndex = index
      this._checkAllowance()
      this._refreshLPBalance()
    }
  }

  async doApprove() {
    if (!this.model.loginAccount) return
    const pool = this.model.pools[this.model.selectedIndex]
    if (!pool) return

    const { tokenAddr } = pool
    const distributorAddr = this.service.realdao.distributor(true).options.address
    await this.service.realdao.approve(tokenAddr, distributorAddr, this.model.loginAccount)
  }

  async doStake() {
    if (!this.model.loginAccount) return
    const pool = this.model.pools[this.model.selectedIndex]
    if (!pool) return

    const inputAmount = Number(this.model.inputStakeAmount)
    if (Number.isNaN(inputAmount) || inputAmount <= 0) return

    const realAmount = literalToReal(inputAmount, 18)
    await this.service.realdao
      .distributor()
      .mintExchangingPool(pool.id, realAmount)
      .send({ from: this.model.loginAccount })
  }

  async _checkAllowance() {
    const pool = this.model.pools[this.model.selectedIndex]
    if (!pool || !this.model.loginAccount) {
      this.model.needApprove = false
      return
    }
    const tokenAddr = pool.tokenAddr
    const distributorAddr = await this.service.realdao.getDistributorAddress()
    this.model.needApprove = await this.service.realdao.needApprove(tokenAddr, distributorAddr, this.model.loginAccount)
  }

  async _refresh(force) {
    if (!force && Date.now() - this.lastRefreshTime < this.refreshInterval) {
      return
    }
    console.log('refresh mining module', force)
    this.lastRefreshTime = Date.now()

    const realdao = this.service.realdao
    logger.debug('loginAccount:', this.model.loginAccount)
    const miningInfo = await realdao.getPools(this.model.loginAccount)
    logger.debug('miningInfo:', miningInfo)
    this.model.pools = miningInfo.pools
    this.model.my = miningInfo.my

    this.selectPool(this.model.selectedIndex)
    this.model.loaded = true
  }

  async _refreshLPBalance() {
    if (!this.model.loginAccount) return
    const pool = this.model.pools[this.model.selectedIndex]
    if (!pool || pool.ptype !== 2) return

    const { tokenAddr } = pool
    const contract = this.service.realdao.erc20Token(tokenAddr)
    const results = await Promise.all([contract.balanceOf(this.model.loginAccount).call(), contract.decimals().call()])
    logger.debug('refresh LP balance:', tokenAddr, results)
    const balance = realToLiteral(results[0], results[1])
    this.model.lpBalance = balance
  }
}
