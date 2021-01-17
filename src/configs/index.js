import { parseQuery } from '../lib/utils.js'

export async function getConfig(env) {
  const query = parseQuery(window.location.search)
  if (!env) {
    env = query.env || 'mainnet'
  }
  let defaultLogLevel = env === 'mainnet' ? 'FATAL' : 'DEBUG'
  const generalConfig = {
    refreshInterval: 3000,
    env,
    logLevel: query.logLevel || defaultLogLevel,
  }
  const envConfig = await import(`./config.${env}.js`)
  return Object.assign(generalConfig, envConfig.default)
}
