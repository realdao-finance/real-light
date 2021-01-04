import * as wallet from '../lib/wallet.js'
import { EventProxy } from '../lib/event-proxy.js'

const ACCOUNT_CHANGE_EVENT = 'accountChanged'

export class Overview {
  constructor(options) {
    this.vm = new Vue({
      el: '#overview',
      data: {
        overview: {
          totalSupplyAccLiteral: 0,
          totalReservesAccLiteral: 0,
          totalBorrowsAccLiteral: 0,
          markets: [],
          rds: {},
          dol: {},
        },
        walletInstalled: false,
        walletButtonText: '',
        loginAccount: null,
      },
      methods: {
        login: this.login.bind(this),
        toggleMode: options.mode.update,
      },
      computed: {
        ellipsisAccount: function () {
          if (!this.loginAccount) return ''
          const len = this.loginAccount.length
          return this.loginAccount.slice(0, 8) + '...' + this.loginAccount.slice(len - 6, len)
        },
        accountUrl: function () {
          if (!this.loginAccount) return ''
          return `https://${options.config.etherscan}/address/${this.loginAccount}`
        },
      },
    })
    this.ep = new EventProxy()
    this.options = options
  }

  onAccountChanged(handler) {
    this.ep.on(ACCOUNT_CHANGE_EVENT, handler)
  }

  async run() {
    const realDAO = this.options.realDAO
    const overview = await realDAO.getOverview()
    console.log('overview:', overview)
    this.vm.overview = overview
    this._checkWallet()
    wallet.onAccountChanged(this._checkWallet.bind(this))
  }

  login() {
    wallet
      .connect()
      .then(() => {
        this._checkWallet()
      })
      .catch((err) => {
        alert('Wallet Connect Error:' + err)
      })
  }

  _setWalletButtonText(str) {
    console.log('wallet tip', str)
    this.vm.walletButtonText = str
  }

  _checkWallet() {
    if (!wallet.isInstalled()) {
      this.vm.walletInstalled = false
      return
    }
    this.vm.walletInstalled = true

    if (!wallet.isConnected()) {
      return this._setWalletButtonText('Login')
    }
    if (wallet.getChainId() !== this.options.config.chainId) {
      return this._setWalletButtonText('Wrong Network')
    }
    wallet
      .getDefaultAccount()
      .then((account) => {
        console.log('selectAccount:', account)
        if (account) {
          this._setWalletButtonText('')
          this.vm.loginAccount = account
          this.ep.emit(ACCOUNT_CHANGE_EVENT, account)
        } else {
          this._setWalletButtonText('Login')
        }
      })
      .catch((err) => {
        this._setWalletButtonText('Account Not Found')
      })
  }
}
