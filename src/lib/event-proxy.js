export class EventProxy {
  constructor() {
    this.listeners = new Map()
  }

  on(event, handler) {
    const handlers = this.listeners.get(event)
    if (!handlers) {
      this.listeners.set(event, [handler])
    } else {
      handlers.push(handler)
    }
  }

  emit(event, ...args) {
    const handlers = this.listeners.get(event) || []
    for (const handler of handlers) {
      handler(...args)
    }
  }
}
