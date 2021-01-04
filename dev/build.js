const pug = require('pug')

function main(argv) {
  const file = argv[2]
  const compile = pug.compileFile(file, { basedir: '../src' })
  const html = compile({})
  console.log(html)
}

main(process.argv)
