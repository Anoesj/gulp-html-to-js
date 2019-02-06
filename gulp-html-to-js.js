'use strict'

const pt = require('path')
const {Transform} = require('stream')
const File = require('vinyl')

/*
Options:

options.concat

  Create just one module with the provided name that exports strings keyed by
  relative file paths. If not provided, each source file is transformed into a
  separate module.

options.prefix

  Optional prefix for each file path. Relevant only for the "concat" option.

options.varName

  Identifier for the "export" object; default `module.exports` for compatibility
  with CommonJS. You can set it to something like `window.templates` if you're
  not using a module bundler.
*/
module.exports = function gulpHtmlToJs(options) {
  options = Object.assign({}, options)
  if (!options.varName) options.varName = 'module.exports'
  if (options.concat) return concatTransform(options)
  return separateTransform(options)
}

function concatTransform({concat, prefix, varName, esModule = false, stripExtension = false}) {
  if (!concat || typeof concat !== 'string') {
    throw Error(`Option 'concat' must be a non-empty string, got: ${concat}`)
  }

  const lines = [`${esModule === true ? 'export const ' : ''}${varName} = {`]

  return new Transform({
    objectMode: true,

    transform(file, __, done) {
      if (file.isBuffer()) {
        let path = toUnixPath(pt.join(prefix || '', file.relative))
        if (stripExtension === true) path = pt.parse(path).name;
        const text = file.contents.toString()
        lines.push(`'${escape(path)}': '${escape(text)}',`)
      }
      done()
    },

    flush(done) {
      lines.push('};')

      this.push(new File({
        path: concat,
        contents: Buffer.from(lines.join('\n')),
      }))
      done()
    },
  })
}

function separateTransform({varName, esModule = false}) {
  return new Transform({
    objectMode: true,
    transform(file, __, done) {
      if (file.isBuffer()) {
        this.push(new File({
          path: file.relative + '.js',
          contents: Buffer.from(`${esModule ? 'export const ' : ''}${varName} = '${escape(file.contents.toString())}';`),
        }))
      }
      done()
    },
  })
}

// Windows path to Unix path
function toUnixPath(text) {
  return text.replace(/\\/g, '/')
}

function escape(text) {
  return text.replace(/'/g, "\\'").replace(/\r\n|\n/g, '\\n')
}
