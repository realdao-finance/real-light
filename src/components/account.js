export class Account {
  constructor(options) {
    this.vm = new Vue({
      el: '#account',
      data: {
        sheets: [],
        rds: {},
        address: null,
      },
      methods: {},
      computed: {},
    })
    this.options = options
  }

  setAddress(addr) {
    const old = this.vm.address
    this.vm.address = addr
    if (old !== addr) {
      this._refresh()
    }
  }

  async run() {
    this._refresh()
  }

  async _refresh() {
    if (!this.vm.address) return
    const realDAO = this.options.realDAO
    const result = await realDAO.getAccountBalances(this.vm.address)
    console.log('getAccountBalances:', result)
    this.vm.sheets = result.sheets || []
    this.vm.rds = result.rds || {}
  }
}
