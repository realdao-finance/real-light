process.env.DEBUG = process.env.DEBUG || 'realdao*'

const path = require('path')
const express = require('express')
const tinylr = require('tiny-lr')
const debug = require('debug')('realdao:server')
const gaze = require('gaze')

const port = process.env.LR_PORT || process.env.PORT || 35729
const srcDir = path.join(__dirname, '..', 'src')

function logger(fmt) {
  fmt = fmt || '%s - %s'

  return function logger(req, res, next) {
    debug(fmt, req.method, req.url)
    next()
  }
}

function getRelativePath(fullpath) {
  return fullpath.replace(srcDir, '')
}

function watch(pattern) {
  gaze(pattern, (err, watcher) => {
    if (err) throw err

    debug(`watching ${pattern}`)
    watcher.on('changed', (filepath) => {
      const relativePath = getRelativePath(filepath)
      debug('file changed:', relativePath)
      tinylr.changed(relativePath)
    })
  })
}

function main() {
  const app = express()

  app.use(logger())
  app.use(express.static(srcDir))
  app.use(tinylr.middleware({ app }))
  app.set('view engine', 'pug')
  app.set('views', path.join(srcDir, 'pages'))
  
  app.get('/:page', (req, res) => {
    res.render(req.params.page || 'main', {})
  })

  debug('starting server')
  app.listen(port, (err) => {
    if (err) throw err
    debug(`listening on http://127.0.0.1:${port}`)

    watch(path.join(srcDir, '**', '*'))
  })
}

main(process.argv)
