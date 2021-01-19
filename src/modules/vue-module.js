export default class VueModule {
  constructor() {
    this.mounted = () => {
      this._doRefresh()
    }

    this.activated = () => {
      this._doRefresh()
    }

    this.deactivated = () => {
      this._doClear()
    }

    this.destroyed = () => {
      this._doClear()
    }
  }

  _doRefresh() {
    const refresh = this._refresh.bind(this)
    refresh()
    this.interval = setInterval(refresh, this.refreshInterval || 10000)
  }

  _doClear() {
    if (this.interval) {
      clearInterval(this.interval)
      this.interval = null
    }
  }
}
