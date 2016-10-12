const swagger = require('swagger-server')
const swaggerParser = require('swagger-parser')
const XorShift = require('xorshift').constructor
const range = require('array-range')

const crypto = require('crypto')
const glob = require('glob')
const entries = require('./entries')

const path = require('path')
const fs = require('fs')
const url = require('url')


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

const alphanum = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
function fakeId(rnd, min = 1, max = 16) {
  let id = ''
  let count = (min || 1) + Math.floor(rnd.random() * Math.max((max || min) - min, 0))
  while (count--) {
    id += alphanum[Math.floor(rnd.random() * alphanum.length)]
  }
  return id
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
  const pathname = range(wc).map(() => fakeWord(rnd).toLowerCase())
  return pathname.length ? `/${pathname.join('/')}/` : '/'
}

const countryPatterns = ['-', '-', '-ia', '-inia', '-ica', 'Saint -', '-stan', '-land',
                        '- Islands', '- Republic', 'South -', 'North -']
function fakeCountry(rnd) {
  const name = fakeTitle(rnd, 1, 1)
  return countryPatterns[Math.floor(rnd.random() * countryPatterns.length)].replace(/\-/, name)
}

const cityPatterns = ['-', '-', 'New -', '- Ford', '- Lake', '-ville', '- Head', '- Hills',
                      '-stok', '-ești', '-dal', '-sund', '-berg', '-foss', '-borg', '-stad']
function fakeCity(rnd) {
  const name = fakeTitle(rnd, 1, 1)
  return cityPatterns[Math.floor(rnd.random() * cityPatterns.length)].replace(/\-/, name)
}

function fakeSlug(rnd, min, max) {
  return fakeTitle(rnd, min, max).toLowerCase().split(' ').join('-')
}

function fakeBoolean(rnd) {
  return rnd.random() > 0.5
}

function fakeNumber(rnd, min = 0, max = 5) {
  return Math.round(1000 * (rnd.random() * Math.max((max || min) - min, 0) + min)) / 1000
}

function fakeInteger(rnd, min = 0, max = 5) {
  return Math.floor(fakeNumber(rnd, min, max))
}

function fakeTime(rnd) {
  return new Date(Math.floor((rnd.random() * 6e11) + (1 * new Date(2000, 0, 0)))).toISOString()
}

function contextString(stack, key = '') {
  let str = stack.join(',').replace(/([a-z])([A-Z])/g, '$1,$2').replace(/_/g, ',')
  if (key) {
    str += `,${key}`
  }
  return str
}


// Other possible string keys:
// - location
// - language
// FIXME: don't ignore min/max (these are character lengths)
function fakeString(rnd, min, max, name, stack) {
  let r = ''
  if (/(?:ids?|codes?|seats?)$/i.test(name)) {
    r = fakeId(rnd, min, max)
  }
  else if (/(?:usernames?)$/i.test(name)) {
    r = fakeSlug(rnd, 1, 2)
  }
  else if (/(?:email)s?$/i.test(name)) {
    r = `${fakeSlug(rnd, 1, 2)}@example.com`
  }
  else if (/(?:name)s?$/i.test(name)) {
    if (/\b(user)s?\b/i.test(contextString(stack, name))) {
      r = fakeTitle(rnd, 1, 3)
    }
    else {
      r = fakeSlug(rnd, min, max)
    }
  }
  else if (/(?:slug|key)s?$/i.test(name)) {
    r = fakeSlug(rnd)
  }
  else if (/(?:country)s?$/i.test(name)) {
    r = fakeCountry(rnd)
  }
  else if (/(?:city)s?$/i.test(name)) {
    r = fakeCity(rnd)
  }
  else if (/(?:content|body|text)s?$/i.test(name)) {
    r = fakeParagraph(rnd, 3, 10)
  }
  else if (/(?:time)s?$/i.test(name)) {
    r = fakeTime(rnd)
  }
  else if (/(?:types?|class(?:es)?|categor(?:y|ies)|\btags?)$/i.test(name)) {
    r = fakeType(rnd)
  }
  else if (/(?:title)s?$/i.test(name)) {
    r = fakeTitle(rnd)
  }
  else if (/(?:path|pathname)s?$/i.test(name)) {
    r = fakePath(rnd)
  }
  else if (/(?:url|uri)s?$/i.test(name)) {
    if (/\b(media|img|image)s?\b/i.test(contextString(stack, name))) {
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
    if (min || max) {
      r = fakeId(rnd, min, max)
    }
    else {
      r = fakeTitle(rnd, 1, 3)
    }
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
    // every key has a 30% chance of making an appearance,
    // despite being required or having defaults
    else if (rnd.random() > 0.3) {
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
      range(1 + Math.floor(rnd.random() * 3)).forEach(() => {
        const tempId = fakeSlug(rnd, 2, 2)
        val[tempId] = fieldHandler(rnd, tempId, field.additionalProperties, stack.concat([key]))
      })
    }
  }
  else if (field.type === 'string') {
    if (field.enum) {
      val = field.enum[Math.floor(rnd.random() * field.enum.length)]
    }
    else {
      val = useDefault(field, 'Length')
              ? field.default
              : fakeString(rnd, field.minLength, field.maxLength, key, stack.concat([key]))
    }
  }
  else if (field.type === 'integer') {
    // FIXME: Should use exclusiveMinimum/exclusiveMaximum to control
    val = useDefault(field, 'imum')
            ? field.default
            : fakeInteger(rnd, field.minimum, field.maximum)
  }
  else if (field.type === 'number') {
    // FIXME: Should use exclusiveMinimum/exclusiveMaximum to control
    val = useDefault(field, 'imum')
            ? field.default
            : fakeNumber(rnd, field.minimum, field.maximum)
  }
  else if (field.type === 'boolean') {
    val = fakeBoolean(rnd)
  }
  else {
    console.error(`Encountered unsupported field type: ${field.type}`)
  }
  return val
}


function readExamples(contractFn, api) {
  const contractDir = path.dirname(contractFn)
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
      file: path.basename(fn),
    }
  }).filter(Boolean)
}


function findExample(req, api) {
  const parsedUrl = url.parse(req.url, true)
  // try to match a prebuilt example reply
  if (!api.examples) {
    return undefined
  }
  const method = req.method.toLowerCase()
  let cand = api.examples.filter(d => d.path === parsedUrl.pathname && d.method === method)
  if (cand.length > 1) {
    // In case there are more than one valid answers for the same path we try to pick
    // the answer with the most "identical" query string. There was no obvious answer
    // to which was more relevant "2 keys exist in both (but values differ)" or
    // "1 key has exactly identical value" -- so both cases are treated equal
    cand = cand
        .map(d => {
          let score = 0
          for (const [key, val] of entries(d.obj.request.query || {})) {
            if (key in parsedUrl.query) {
              // parameter exists in both query and example
              score += 1
              // parameter is, additionally, the same in both query and example
              if (parsedUrl.query[key] === val) {
                score += 1
              }
            }
          }
          return [score, d]
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


module.exports = function (options) {
  const servers = []

  glob.sync(options.contracts, { follow: true }).forEach(contract => {
    servers.push(new Promise((resolve, reject) => {
      const server = new swagger.Server()
      server.parse(contract)
      server.enable('case sensitive routing')
      server.enable('strict routing')
      const contractTitle = contract.replace(/^.*?\/upstream\/?/, '').replace(/\/?contract\.ya?ml$/, '')

      swaggerParser.validate(contract, (err, api) => {
        if (err) {
          reject(`Onoes! The API is invalid. ${err.message}`)
        }

        api.examples = readExamples(contract, api)

        for (const [pathKey, apiMethod] of entries(api.paths)) {
          for (const [method] of entries(apiMethod)) {
            const methodUpper = method.toUpperCase()

            if (options.verbose) {
              console.log(`[swagger-fakeapi] Adding [${contractTitle}] ${methodUpper} ${api.basePath}${pathKey}`)
            }

            server[method](api.basePath + pathKey, (req, res) => {
              const example = findExample(req, api)
              if (example) {
                if (options.verbose) {
                  console.log(`[swagger-fakeapi] Prepared ${methodUpper} response: ${req.url}`)
                }
                res.header('X-FakeAPI-file', example.file)
                // send headers
                const r = example.obj.response
                for (const [header, headerValue] of entries(r.headers)) {
                  // entries(r.headers)
                  res.header(header, headerValue)
                }
                res.status(r.status || 200)
                // send response body
                res.send(r.content)
              }
              else {
                if (options.verbose) {
                  console.log(`[swagger-fakeapi] Fabricated ${methodUpper} response: ${req.url}`)
                }
                // use a consistent seed throughout the response to ensure deterministic responses
                const seed = seedFrom(req.url)
                res.header('X-FakeAPI-seed', seed)

                const apiRes = apiMethod[method].responses[200]

                // fabricate headers
                const headRand = getRandomizer(seed)
                for (const [header] of entries(apiRes.headers)) {
                  res.header(header, fakeString(headRand, 2, 8, header))
                }
                // fabricate response body
                const bodyRand = getRandomizer(seed)
                const body = fieldHandler(bodyRand, api.basePath + pathKey, apiRes.schema)
                res.send(body)
              }
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
