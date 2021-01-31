const pug = require('pug')
const path = require('path')
const fs = require('fs')
const shell = require('shelljs')

function main(argv) {
  const page = argv[2]
  const rootDir = path.join(__dirname, '..')
  const srcDir = path.join(rootDir, 'src')
  const distDir = path.join(rootDir, 'dist')
  const pageSrc = path.join(srcDir, 'pages', page + '.pug')
  const pageDst = path.join(distDir, 'index.html')

  console.log('compiling...')
  const compile = pug.compileFile(pageSrc, { basedir: srcDir })
  const html = compile({})

  if (!fs.existsSync(distDir)) {
    shell.mkdir(distDir)
  }
  console.log('copying source files to dist directory...')
  shell.cp('-rf', path.join(srcDir, '*'), distDir)
  console.log('writing html content...')
  fs.writeFileSync(pageDst, html)
  console.log('done!')
}

main(process.argv)
