export async function getConfig(env) {
  const generalConfig = {
    refreshInterval: 10000,
  }
  const envConfig = await import(`./config.${env}.js`)
  return Object.assign(generalConfig, envConfig.default)
}
