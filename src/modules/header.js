import * as wallet from '../lib/wallet.js'
import { EventProxy } from '../lib/event-proxy.js'
const { mode } = window.__pdm__

const ACCOUNT_CHANGE_EVENT = 'accountChanged'

export class Header {
  constructor(options) {
    this.vm = new Vue({
      el: '#header',
      data: {
        overview: {
          totalSupplyAccLiteral: 0,
          totalReservesAccLiteral: 0,
          totalBorrowsAccLiteral: 0,
          rds: {},
          dol: {},
        },
        walletInstalled: false,
        walletButtonText: '',
        loginAccount: null,
        theme: 'dark',
        loaded: false,
      },
      methods: {
        login: this.login.bind(this),
        toogleTheme: this.toogleTheme.bind(this),
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
    this.options = options

    this.ep = new EventProxy()
    this.mode = mode
    this.mode.set('light')
  }

  onAccountChanged(handler) {
    this.ep.on(ACCOUNT_CHANGE_EVENT, handler)
  }

  setOverviewData(overview) {
    this.vm.overview = overview
    this.vm.loaded = true
  }

  async run() {
    this._checkWallet()
    wallet.onAccountChanged(this._checkWallet.bind(this))
  }

  toogleTheme() {
    const newTheme = this.vm.theme === 'dark' ? 'light' : 'dark'
    this.mode.set(this.vm.theme)
    this.vm.theme = newTheme
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
          this._refresh()
        } else {
          this._setWalletButtonText('Login')
        }
      })
      .catch((err) => {
        console.log('failed to get account:', err)
        this._setWalletButtonText('Account Not Found')
      })
  }
}
