import { parseBasename } from './parser.js'

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

export async function loadModules(files, options) {
  const modules = []
  for (const file of files) {
    const Module = await import(file)
    const instance = new Module.default(options)
    await instance.initialize()
    modules.push(instance)
  }
  for (const mod of modules) {
    mod.run()
  }
  return modules
}
