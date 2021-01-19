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

export async function loadModule(dir, options) {
  const jsFile = `${dir}/index.js`
  const tmplFile = `${dir}/index.html`
  const Module = await import(jsFile)
  const instance = new Module.default(options)
  // instance.template = `#${name.toLowerCase()}`
  instance.data = () => {
    return instance.model
  }
  const tmplResponse = await fetch(tmplFile)
  const tmplContent = await tmplResponse.text()
  instance.template = tmplContent
  return instance
}

export async function loadModules(dirs, options, routes) {
  const modules = []
  for (const dir of dirs) {
    const parts = dir.split('/')
    const tag = parts[parts.length - 1]
    const instance = await loadModule(dir, options)
    if (instance.path) {
      routes.push({ path: instance.path, component: instance })
      if (instance.isHome) {
        routes.push({ path: '/', redirect: instance.path })
      }
    } else {
    }
    Vue.component(tag, instance)
    modules.push(instance)
  }
  return modules
}
