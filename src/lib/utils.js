export function parseQuery(str) {
  const kvs = str.slice(1).split('&')
  const query = {}
  for (const item of kvs) {
    const [key, value] = item.split('=')
    query[key] = value
  }
  return query
}

export function parseBasename(str) {
  const parts = str.split('/')
  const filename = parts[parts.length - 1]
  return filename.split('.')[0]
}

export function literalToReal(val, decimals) {
  const real = Number(val) * 10 ** Number(decimals)
  return real.toString()
}

export function realToLiteral(val, decimals) {
  const literal = Number(val) / 10 ** Number(decimals)
  return literal
}

export function toFixed(val, num) {
  return Number(val).toFixed(num)
}

export function toFixedPercent(val, num) {
  const fixed = (Number(val) * 100).toFixed(num)
  return `${fixed}%`
}
