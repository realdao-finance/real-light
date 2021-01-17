import { parseQuery } from '../lib/utils.js'

export async function getConfig(env) {
  if (!env) {
    const query = parseQuery(window.location.search)
    env = query.env || 'mainnet'
  }
  const generalConfig = {
    refreshInterval: 3000,
    env,
  }
  const envConfig = await import(`./config.${env}.js`)
  return Object.assign(generalConfig, envConfig.default)
}
