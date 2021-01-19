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

export async function loadModules(moduleConfigs, options, routes) {
  for (const config of moduleConfigs) {
    const parts = config.path.split('/')
    const tag = parts[parts.length - 1]
    // FIXME use module config
    if (config.route) {
      routes.push({ path: config.route, component: () => loadModule(config.path, options) })
      if (config.home) routes.push({ path: '/', redirect: config.route })
    } else {
      const instance = await loadModule(config.path, options)
      Vue.component(tag, instance)
    }
  }
}
