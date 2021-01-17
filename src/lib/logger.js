const LEVELS = {
  TRACE: 10,
  DEBUG: 20,
  INFO: 30,
  WARN: 40,
  ERROR: 50,
  FATAL: 60,
}

class Logger {
  constructor(options = {}) {
    const silent = options.silent || false
    this._debug = options.debug || false

    const levelName = options.level || 'DEBUG'
    this.level = LEVELS[levelName]

    if (silent) {
      this.level = LEVELS.FATAL + 10
    }

    if (this._debug) {
      this.level = LEVELS.TRACE
    }
  }

  _writeLogOutput(level, consoleArgs) {
    if (level >= this.level) {
      const str = new Date().toISOString().substring(11, 23) + ' '
      if (level < LEVELS.WARN) {
        console.log(str, ...consoleArgs)
      } else if (level < LEVELS.ERROR) {
        console.warn(str, ...consoleArgs)
      } else {
        console.error(str, ...consoleArgs)
      }
    }
  }

  trace(...args) {
    this._writeLogOutput(LEVELS.TRACE, args)
  }

  debug(...args) {
    this._writeLogOutput(LEVELS.DEBUG, args)
  }

  info(...args) {
    this._writeLogOutput(LEVELS.INFO, args)
  }

  warn(...args) {
    this._writeLogOutput(LEVELS.WARN, args)
  }

  error(...args) {
    this._writeLogOutput(LEVELS.ERROR, args)
  }

  fatal(...args) {
    this._writeLogOutput(LEVELS.FATAL, args)
  }
}

export function createLogger(options) {
  const logger = new Logger(options)

  logger.d = logger.debug
  logger.i = logger.info
  logger.w = logger.warn
  logger.e = logger.error
  logger.log = logger.info

  return logger
}
