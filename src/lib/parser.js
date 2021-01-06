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
