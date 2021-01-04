export class Mining {
  constructor(options) {
    this.vm = new Vue({
      el: options.el,
      data: {
        pools: [],
        my: [],
      },
      methods: {},
      computed: {},
    })
    this.options = options
  }

  async run() {
    const realDAO = this.options.realDAO
    const miningInfo = await realDAO.getPools()
    console.log('miningInfo:', miningInfo)
    this.vm.pools = miningInfo.pools
    this.vm.my = miningInfo.my
  }
}
