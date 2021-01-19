import { parseBasename } from './utils.js'

export async function loadServices(files, options) {
  const service = {}
  for (const file of files) {
    const Module = await import(file)
    const instance = new Module.default(options)
    await instance.initialize()
    const basename = parseBasename(file)
    service[basename] = instance
  }
  return service
}

export async function loadModules(dirs, options) {
  const modules = []
  for (const dir of dirs) {
    const jsFile = `${dir}/index.js`
    const tempFile = `${dir}/index.html`
    const Module = await import(jsFile)
    const instance = new Module.default(options)
    const name = Module.default.name
    // instance.template = `#${name.toLowerCase()}`
    instance.data = () => {
      return instance.model
    }
    Vue.component(name, (resolve, reject) => {
      fetch(tempFile)
        .then((result) => result.text())
        .then((html) => {
          instance.template = html
          resolve(instance)
        })
        .catch(reject)
    })
    await instance.initialize()
    modules.push(instance)
  }
  return modules
}
