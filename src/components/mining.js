export class Mining {
  constructor(options) {
    this.vm = new Vue({
      el: '#mining',
      data: {
        pools: [],
        my: [],
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
    const realDAO = this.options.realDAO
    const miningInfo = await realDAO.getPools(this.address)
    console.log('miningInfo:', miningInfo)
    this.vm.pools = miningInfo.pools
    this.vm.my = miningInfo.my
  }
}
