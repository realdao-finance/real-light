class VueComponent {
  constructor() {
    this.mounted = () => {
      console.log('mounted', this.name)
    }
    this.activated = () => {
      console.log('activated', this.name)
    }
    this.deactivated = () => {
      console.log('deactivated', this.name)
    }
    this.destroyed = () => {
      console.log('destroyed', this.name)
    }
  }
}
class MyComp1 extends VueComponent {
  constructor() {
    super()
    this.template = '<button v-on:click="count++">Comp1: {{ count }} times.</button>'
    this.model = {
      name: 'comp1',
      count: 1,
    }
  }
}

class MyComp2 extends VueComponent {
  constructor() {
    super()
    this.template = '<button v-on:click="increment">Comp2: {{ count }} times.</button>'
    this.model = {
      name: 'comp2',
      count: 10,
    }
    this.methods = {
      increment: () => {
        this.model.count++
      },
    }
  }
}

export async function main(arr) {
  const m1 = new MyComp1()
  m1.data = () => {
    return m1.model
  }
  const m2 = new MyComp2()
  m2.data = () => {
    return m2.model
  }
  Vue.component('my-comp1', m1)
  Vue.component('my-comp2', m2)
  new Vue({
    el: '#app',
    data: {
      currentTab: 'my-comp1',
      tabs: ['my-comp1', 'my-comp2'],
    },
  })
}
// window.onload = main
