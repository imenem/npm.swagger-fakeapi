const swagger = require('swagger-server')
const range = require('array-range')

const crypto = require('crypto')
const glob = require('glob')
const entries = require('./entries')

const path = require('path')
const fs = require('fs')
const url = require('url')

const fake = require('./fake')

function seedFrom (str) {
  return crypto.createHash('sha256').update(str, 'utf8').digest('hex')
}

function getRandomizer (seed) {
  return Math
}


function objectMaker (rnd, schema, stack = [], ctx = {}) {
  const ret = {}
  const fields = new Set(schema.required || [])
  Object.keys(schema.properties || {}).forEach(key => {
    if ('default' in schema.properties[key]) {
      fields.add(key)
    }
    // every key has a 75% chance of making an appearance,
    // despite being required or having defaults
    else if (rnd.random() < 0.75) {
      fields.add(key)
    }
  })
  fields.forEach(key => {
    const field = schema.properties[key]
    const val = fieldHandler(rnd, key, field, stack, ctx)
    if (val != null) {
      ret[key] = val
    }
  })
  return ret
}


function useDefault (field, fieldPostfix) {
  return ('default' in field && field[`max${fieldPostfix}`] == null && field[`min${fieldPostfix}`] == null)
}

function useExample (field, ctx) {
  return ('example' in field && ctx && ctx.app && ctx.app.settings && ctx.app.settings.useExampleProp)
}


function contextString (stack, key = '') {
  let str = stack.join(',').replace(/([a-z])([A-Z])/g, '$1,$2').replace(/_/g, ',')
  if (key) {
    str += `,${key.replace(/([a-z])([A-Z])/g, '$1,$2').replace(/_/g, ',')}`
  }
  return str
}


function fieldHandler (rnd, key, field = {}, stack = [], ctx = {}) {
  let val
  // enumumerated fields make life a lot easier...
  if (field.enum) {
    return field.enum[Math.floor(rnd.random() * field.enum.length)]
  }
  // allow refs to variables
  if (field['x-mocker-value']) {
    const mockVal = field['x-mocker-value']
    if (mockVal === '#name') {
      return key
    }
    if (mockVal === '#key') {
      return stack[stack.length - 1]
    }
    // x-mocker-value: ?queryParam
    if (mockVal[0] === '?') {
      const q = mockVal.slice(1)
      if (ctx.query && q in ctx.query) {
        return ctx.query[q]
      }
    }
    // x-mocker-value: {pathParam}
    if (/^\{.*?\}$/.test(mockVal)) {
      const q = mockVal.slice(1, -1).trim()
      if (ctx.params && q in ctx.params) {
        return ctx.params[q]
      }
    }
  }
  // == arrays ==
  if (field.type === 'array') {
    const numItems = fake.integer(rnd, field.minItems || 1, field.maxItems)
    val = range(numItems).map(() => {
      const subtype = field.items.type || 'object'
      if (subtype === 'object') {
        return objectMaker(rnd, field.items, stack.concat([ key ]), ctx)
      }
      return fieldHandler(rnd, key, field.items, stack.concat([ key ]), ctx)
    })
    // this may reduce the array to below what minItems says but the alternative
    // is a lot of code to ensure a codepath for !uniqueItems and avoiding an
    // inf.loop where uniqueItems=true && minItems=4 && enum=[1, 2]
    if (field.uniqueItems && val.length) {
      val = [ ...new Set(val).values() ]
    }
  }
  // == objects ==
  else if (!field.type || field.type === 'object') {
    val = objectMaker(rnd, field, stack.concat([ key ]), ctx)
    if (field.additionalProperties) {
      const keyType = field.additionalProperties['x-mocker-keyformat'] || 'slug'
      range(1 + Math.floor(rnd.random() * 3)).forEach(() => {
        const tempId = fake[keyType].call(field, rnd, 2, 2)
        val[tempId] = fieldHandler(rnd, tempId, field.additionalProperties, stack.concat([ key ]), ctx)
      })
    }
  }
  // == numbers ==
  // possible combinations of type and formats:
  //   integer int64
  //   integer int32
  //   integer
  //   number double
  //   number float
  //   number
  else if (field.type === 'number' || field.type === 'integer') {
    if (useDefault(field, 'imum')) {
      val = field.default
    }
    else {
      const min = (field.minimum != null) ? field.minimum : 0
      const max = (field.maximum != null) ? field.maximum : 10
      if (field.exclusiveMinimum) {
        // TODO: number exclusiveMinimum
        // If "exclusiveMinimum" is present, "minimum" MUST also be present.
      }
      if (field.exclusiveMaximum) {
        // TODO: number exclusiveMaximum
        // If "exclusiveMaximum" is present, "maximum" MUST also be present.
      }
      // TODO: multipleOf
      if (key === 'id' || (field['x-mocker-format'] && field['x-mocker-format'] === 'id')) {
        val = fake.monotonicId()
      }
      else if (field.type === 'number') {
        val = fake.number(rnd, min, max)
      }
      else {
        val = fake.integer(rnd, min, max)
      }
    }
  }
  // == booleans ==
  else if (field.type === 'boolean') {
    val = fake.boolean(rnd)
  }
  // == strings ==
  // possible combinations of type and formats:
  //   string
  //   string byte
  //   string binary
  //   string date
  //   string date-time
  //   string password
  else if (field.type === 'string') {
    if (useDefault(field, 'Length')) {
      val = field.default
    }
    else if (useExample(field, ctx)) {
      val = field.example
    }
    else {
      let handlerId = fake.guessStringFormat(contextString(stack, key))
      if (field.format === 'date') {
        handlerId = 'date'
      }
      else if (field.format === 'date-time') {
        handlerId = 'dateTime'
      }
      if (field['x-mocker-format'] && field['x-mocker-format'] in fake) {
        handlerId = field['x-mocker-format']
      }
      val = fake[handlerId].call(field, rnd, field.minLength, field.maxLength)
    }
  }
  // ... file ...
  else {
    console.error(`Encountered unsupported field type: ${field.type}`)
  }
  return val
}


function readExamples (contractFilename, api) {
  const contractDir = path.dirname(contractFilename)
  return glob.sync(`${contractDir}/**/*.json`).map(fn => {
    const obj = JSON.parse(fs.readFileSync(fn, 'utf8'))

    // assume only 1 path per obj file
    const urlpath = Object.keys(obj)[0]
    const fullpath = (urlpath.indexOf(api.basePath) !== 0) ? api.basePath + urlpath : urlpath

    // assume only 1 method per obj file
    const method = Object.keys(obj[urlpath])[0]

    return {
      path: fullpath,
      method: method.toLowerCase(),
      obj: obj[urlpath][method],
      file: path.basename(fn)
    }
  }).filter(Boolean)
}


function findExample (req, examples) {
  const parsedUrl = url.parse(req.url, true)
  // try to match a prebuilt example reply
  if (!examples) {
    return undefined
  }
  const method = req.method.toLowerCase()
  let cand = examples.filter(d => d.path === parsedUrl.pathname && d.method === method)
  if (cand.length > 1) {
    // In case there are more than one valid answers for the same path we try to pick
    // the answer with the most "identical" query string. There was no obvious answer
    // to which was more relevant "2 keys exist in both (but values differ)" or
    // "1 key has exactly identical value" -- so both cases are treated equal
    cand = cand
      .map(d => {
        let score = 0
        for (const [ key, val ] of entries(d.obj.request.query || {})) {
          if (key in parsedUrl.query) {
            // parameter exists in both query and example
            score += 1
            // parameter is, additionally, the same in both query and example
            if (parsedUrl.query[key] === val) {
              score += 1
            }
          }
        }
        return [ score, d ]
      })
      .sort((a, b) => b[0] - a[0])

    // cut this down to only entries that share the top score
    const topScore = cand[0][0]
    cand = cand.filter(d => d[0] === topScore)

    // if we still have multiple candidates, prefer valid to error
    const statusCodes = Array.from(new Set(cand.map(d => d[1].obj.response.status)))
    if (statusCodes.length > 1) {
      // BT: this simply sorts on the status code which happily are roughly ordered by "success"
      //     so we prefer lower codes to higher ones.
      //     https://en.wikipedia.org/wiki/List_of_HTTP_status_codes
      cand = cand.sort((a, b) => a[1].obj.response.status - b[1].obj.response.status)
    }

    // pull actual example responses from the list of candidates
    cand = cand.map(d => d[1])
  }
  return cand[0]
}


function errorHandler (err, req, res, next) {
  if (err.status === 404 && /^Resource not found:/.test(err.message)) {
    // discard 404 errors from the swagger validator
    // this makes the environment robust against shared basepaths
    next()
  }
  else if (!!err.stack) {
    // is this a stacktrace
    res.set('Content-Type', 'text/plain')
    res.status(err.status || 500)
    res.send(err.message)
  }
  else {
    next(err)
  }
}

function requestHandler (req, res, next) {
  const pathLast = req.swagger.pathName.slice(-1)
  const reqLast = req._parsedUrl.pathname.slice(-1)
  // Enforce trailing slashes correctness.
  // Swagger is strict but Express is not
  if ((pathLast === '/' && reqLast !== '/') ||
      (pathLast !== '/' && reqLast === '/')) {
    next()
  }
  else {
    const example = findExample(req, req.app.responseExamples)
    if (example) {
      if (req.app.settings.verbose) {
        console.log(`[swagger-fakeapi] Prepared ${req.method} response: ${req.url}`)
      }
      res.header('X-FakeAPI-file', example.file)
      // send headers
      const r = example.obj.response
      for (const [ header, headerValue ] of entries(r.headers)) {
        res.header(header, headerValue)
      }
      res.status(r.status || 200)
      // send response body
      res.send(r.content)
    }
    else {
      if (req.app.settings.verbose) {
        console.log(`[swagger-fakeapi] Fabricated ${req.method} response: ${req.url}`)
      }
      // use a consistent seed throughout the response to ensure deterministic responses
      const seed = seedFrom(req.url)
      res.header('X-FakeAPI-seed', seed)

      // when fabricating we assume the "best" results (aka lower HTTP code)
      const statusCode = Object.keys(req.swagger.operation.responses).sort()[0]
      const apiRes = req.swagger.operation.responses[statusCode]

      // fabricate headers
      const headRand = getRandomizer(seed)
      for (const [ header ] of entries(apiRes.headers || {})) {
        const headerValue = fake[fake.guessStringFormat(header)](headRand, 2, 8)
        res.header(header, headerValue)
      }

      let body

      if (apiRes.examples) {
        const exampleContentType = req.accepts().find(contentType => apiRes.examples.hasOwnProperty(contentType))
        body = apiRes.examples[exampleContentType]
      }

      if (!body) {
        // fabricate response body
        const bodyRand = getRandomizer(seed)
        const pathContext = req.route.path.replace(/\{[^}]+\}|:\w+/g, '')
        body = fieldHandler(bodyRand, pathContext, apiRes.schema, [], req)
      }

      if (typeof body === 'number') {
        body = String(body)
      }
      res.status(200)
      res.send(body)
    }
  }
}

module.exports = function (options) {
  const servers = []
  const baseDir = path.normalize(options.contracts.replace(/[\\/*.]*(json|ya?ml)$/, ''))
  glob.sync(options.contracts, { follow: true }).forEach(contract => {
    servers.push(new Promise((resolve, reject) => {
      const server = new swagger.Server()
      server.enable('case sensitive routing')
      server.enable('strict routing')
      server.enable('watch files')
      server.app.settings.verbose = options.verbose
      server.app.settings.useExampleProp = !!options.useExampleProp

      server.parse(contract, (swagErr, api) => {
        if (swagErr) {
          reject(`Onoes! The API is invalid. ${swagErr.message}`)
        }
        else {
          const basePath = api.basePath || ''
          if (options.examples !== false) {
            server.app.responseExamples = readExamples(contract, api)
          }
          for (const [ pathKey, apiMethod ] of entries(api.paths)) {
            for (const [ method ] of entries(apiMethod)) {
              const endpoint = path.posix.join(basePath, pathKey)
              if (options.verbose) {
                const name = path.relative(baseDir, contract)
                  .replace(/([\\/*.]*contract)?[\\/*.]*(json|ya?ml)$/, '')
                  .replace(/\.\.\//g, '')
                console.log(`[swagger-fakeapi] Adding [${name}] ${method.toUpperCase()} ${endpoint}`)
              }
              if (method in server) {
                // contracts can define methods such as PARAMETERS
                // which Koa does/may not support
                // eslint-disable-next-line consistent-return
                server[method](endpoint, requestHandler)
              }
            }
          }
          server.use(errorHandler)
          resolve(server)
        }
      })
    }))
  })

  return new Promise((resolve, reject) => {
    Promise.all(servers)
      .then((...args) => resolve(args[0]))
      .catch(reject)
  })
}

module.exports.fieldHandler = fieldHandler
