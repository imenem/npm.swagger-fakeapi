const swagger = require('swagger-server')
const swaggerParser = require('swagger-parser')
const XorShift = require('xorshift').constructor
const range = require('array-range')

const crypto = require('crypto')
const glob = require('glob')
const entries = require('./entries')

function seedFrom(str) {
  return crypto.createHash('sha256').update(str, 'utf8').digest('hex')
}

function getRandomizer(seed) {
  const a = parseInt(seed.slice(0, 16), 16)
  const b = parseInt(seed.slice(16, 32), 16)
  const c = parseInt(seed.slice(32, 48), 16)
  const d = parseInt(seed.slice(48, 64), 16)
  return new XorShift([a, b, c, d])
}

const syll = 'na,ni,no,ma,mi,my,de,ba,be,bu,ko,ke,so,sy,ru,ra,re,wo,wu,fe,fo,fi'.split(',')
function fakeWord(rnd, scount) {
  const sc = scount || 1 + Math.floor(rnd.random() * 4)
  const w = range(sc).map(() => syll[Math.floor(rnd.random() * syll.length)]).join('')
  return w[0].toUpperCase() + w.slice(1).toLowerCase()
}

const types = 'red,yellow,blue,green,pink'.split(',')
function fakeType(rnd) {
  return types[Math.floor(rnd.random() * types.length)]
}

function fakeId(rnd) {
  return `id${Math.floor(rnd.random() * 1e12).toString(36).toUpperCase()}`
}

function fakeTitle(rnd, min = 2, max = 7) {
  const wc = (min || 1) + Math.floor(rnd.random() * Math.max((max || min) - min, 0))
  return range(wc).map(() => fakeWord(rnd)).join(' ')
}

function fakeParagraph(rnd, minLines = 1, maxLines = 4) {
  const sc = minLines + Math.floor(rnd.random() * maxLines)
  const wc = 2 + Math.floor(rnd.random() * 7)
  const paragraph = range(sc).map(() => {
    const sent = range(wc).map(() => fakeWord(rnd)).join(' ')
    return sent[0].toUpperCase() + sent.slice(1).toLowerCase()
  }).join('. ')
  return `${paragraph}.`
}

function fakePath(rnd, min = 0, max = 5) {
  const wc = (min || 0) + Math.floor(rnd.random() * Math.max((max || min) - min, 0))
  const path = range(wc).map(() => fakeWord(rnd).toLowerCase())
  return path.length ? `/${path.join('/')}/` : '/'
}

function fakeSlug(rnd, min, max) {
  return fakeTitle(rnd, min, max).toLowerCase().split(' ').join('-')
}

function fakeBoolean(rnd) {
  return rnd.random() > 0.5
}

function fakeInteger(rnd, min = 0, max = 5) {
  return Math.floor(rnd.random() * Math.max((max || min) - min, 0) + min)
}


// Other possible string keys:
// - location
// - language
// FIXME: don't ignore min/max (these are character lengths)
function fakeString(rnd, min, max, name, stack) {
  let r = ''
  if (/(?:ids?)$/i.test(name)) {
    r = fakeId(rnd)
  }
  else if (/(?:slug|name)s?$/i.test(name)) {
    r = fakeSlug(rnd)
  }
  else if (/(?:types?|categor(?:y|ies)|\btags?)$/i.test(name)) {
    r = fakeType(rnd)
  }
  else if (/(?:title)s?$/i.test(name)) {
    r = fakeTitle(rnd)
  }
  else if (/(?:path|pathname)s?$/i.test(name)) {
    r = fakePath(rnd)
  }
  else if (/(?:url|uri)s?$/i.test(name)) {
    if (/\b(media|img|image)s?\b/i.test(stack.join(','))) {
      const w = 700 + Math.floor(rnd.random() * 4) * 100
      const h = 700 + Math.floor(rnd.random() * 4) * 100
      r = `https://placekitten.com/${w}/${h}`
    }
    else {
      r = `//localhost${fakePath(rnd)}`
    }
  }
  else if (/(?:\balt|summary)$/i.test(name)) {
    r = fakeParagraph(rnd, 1, 2)
  }
  else {
    r = fakeParagraph(rnd, 3, 10)
  }
  return r
}


function fakeObject(rnd, schema, stack = []) {
  const ret = {}
  const fields = new Set(schema.required || [])
  Object.keys(schema.properties || {}).forEach(key => {
    if ('default' in schema.properties[key]) {
      fields.add(key)
    }
  })
  fields.forEach(key => {
    const field = schema.properties[key]
    const val = fieldHandler(rnd, key, field, stack)
    if (val != null) {
      ret[key] = val
    }
  })
  return ret
}

function useDefault(field, fieldPostfix) {
  return ('default' in field && field[`max${fieldPostfix}`] == null && field[`min${fieldPostfix}`] == null)
}


function fieldHandler(rnd, key, field, stack = []) {
  let val
  if (field.type === 'array') {
    const numItems = fakeInteger(rnd, field.minItems || 1, field.maxItems)
    val = range(numItems).map(() => {
      const subtype = field.items.type || 'object'
      if (subtype === 'object') {
        return fakeObject(rnd, field.items, stack.concat([key]))
      }
      return fieldHandler(rnd, key, field.items, stack.concat([key]))
    })
  }
  else if (!field.type || field.type === 'object') {
    val = fakeObject(rnd, field, stack.concat([key]))
    if (field.additionalProperties) {
      range(1 + Math.floor(rnd.random() * 3)).map(() => (
        val[fakeSlug(rnd, 2, 2)] = fakeObject(rnd, field.additionalProperties, stack.concat([key]))
      ))
    }
  }
  else if (field.type === 'string') {
    val = useDefault(field, 'Length')
            ? field.default
            : fakeString(rnd, field.minLength, field.maxLength, key, stack.concat([key]))
  }
  else if (field.type === 'integer') {
    // FIXME: Should use exclusiveMinimum/exclusiveMaximum to control
    val = useDefault(field, 'imum')
            ? field.default
            : fakeInteger(rnd, field.minimum, field.maximum)
  }
  else if (field.type === 'boolean') {
    val = fakeBoolean(rnd)
  }
  else {
    console.error(`Encountered unsupported field type: ${field.type}`)
  }
  return val
}


module.exports = function (contracts) {
  const servers = []

  glob.sync(contracts).forEach(contract => {
    servers.push(new Promise((resolve, reject) => {
      const server = new swagger.Server()
      server.parse(contract)
      server.enable('case sensitive routing')
      server.enable('strict routing')

      swaggerParser.validate(contract, (err, api) => {
        if (err) {
          reject(`Onoes! The API is invalid. ${err.message}`)
        }
        console.log(`[swagger-fakeapi] Adding basePath: ${api.basePath}`)
        for (const [pathKey, apiMethod] of entries(api.paths)) {
          for (const [method] of entries(apiMethod)) {
            server[method](api.basePath + pathKey, (req, res) => {
              console.log(`[swagger-fakeapi] Manual response: ${method} ${req.url}`)
              // use a consistent seed throughout the response to ensure deterministic responses
              const seed = seedFrom(req.url)
              res.header('X-FakeAPI-seed', seed)

              const apiRes = apiMethod[method].responses[200]

              // fabricate headers
              const headRand = getRandomizer(seed)
              for (const [header] of entries(apiRes.headers)) {
                res.header(header, fakeString(headRand, header))
              }

              // fabricate headers
              const bodyRand = getRandomizer(seed)
              const body = fakeObject(bodyRand, apiRes.schema, [pathKey])
              res.send(body)
            })
          }
          resolve(server)
        }
      })
    }))
  })

  return new Promise((resolve, reject) => {
    Promise.all(servers).then((...args) => {
      resolve(args[0])
    }).catch((err) => reject(err))
  })
}
