import { EventProxy } from '../lib/event-proxy.js'
const { mode } = window.__pdm__

const ACCOUNT_CHANGE_EVENT = 'accountChanged'

export class Header {
  constructor(options) {
    this.config = options.config
    this.service = options.service

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
          return `https://${options.config.network.etherscan}/address/${this.loginAccount}`
        },
      },
    })
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
    const checkWallet = this._checkWallet.bind(this)
    this.service.wallet.onAccountChanged(checkWallet)
    this.service.wallet.onChainChanged(checkWallet)
    checkWallet()
  }

  toogleTheme() {
    const newTheme = this.vm.theme === 'dark' ? 'light' : 'dark'
    this.mode.set(this.vm.theme)
    this.vm.theme = newTheme
  }

  login() {
    const wallet = this.service.wallet
    wallet
      .connect()
      .then(() => {
        this._checkWallet()
      })
      .catch((err) => {
        alert('Wallet Connect Error:' + err)
      })
  }

  _showWalletButton(text) {
    console.log('wallet button text', text)
    this.vm.walletButtonText = text
    this.vm.loginAccount = null
  }

  _checkWallet() {
    const wallet = this.service.wallet
    if (!wallet.isInstalled()) {
      this.vm.walletInstalled = false
      return
    }
    this.vm.walletInstalled = true

    if (!wallet.isConnected()) {
      return this._showWalletButton('Login')
    }
    if (wallet.getChainId() !== this.config.network.chainId) {
      return this._showWalletButton('Wrong Network')
    }
    wallet
      .getDefaultAccount()
      .then((account) => {
        console.log('selectAccount:', account)
        if (account) {
          this.vm.loginAccount = account
          this.ep.emit(ACCOUNT_CHANGE_EVENT, account)
        } else {
          this._showWalletButton('Login')
        }
      })
      .catch((err) => {
        console.log('failed to get account:', err)
        this._showWalletButton('Account Not Found')
      })
  }
}
