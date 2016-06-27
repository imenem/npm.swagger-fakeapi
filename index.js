const swagger = require('swagger-server')
const swaggerParser = require('swagger-parser')
const XorShift = require('xorshift').constructor
const range = require('array-range')

const crypto = require('crypto')
const glob = require('glob')

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

function fakeTitle(rnd) {
  const wc = 2 + Math.floor(rnd.random() * 5)
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

function fakePath(rnd) {
  const wc = 1 + Math.floor(rnd.random() * 5)
  const path = range(wc).map(() => fakeWord(rnd).toLowerCase())
  return `/${path.join('/')}/`
}

function fakeSlug(rnd) {
  return fakeTitle(rnd).toLowerCase().split(' ').join('-')
}

function fakeString(rnd, name, stack) {
  let r = ''
  if (/(?:id)$/i.test(name)) {
    r = fakeId(rnd)
  }
  else if (/(?:slug|name)$/i.test(name)) {
    r = fakeSlug(rnd)
  }
  else if (/(?:type)$/i.test(name)) {
    r = fakeType(rnd)
  }
  else if (/(?:title)$/i.test(name)) {
    r = fakeTitle(rnd)
  }
  else if (/(?:path|pathname)$/i.test(name)) {
    r = fakePath(rnd)
  }
  else if (/(?:url|uri)$/i.test(name)) {
    if (/\b(media|img|image)\b/i.test(stack.join(','))) {
      const w = 700 + Math.floor(rnd.random() * 4) * 100
      const h = 700 + Math.floor(rnd.random() * 4) * 100
      r = `https://placekitten.com/${w}/${h}`
    }
    else {
      r = `//localhost${fakePath(rnd)}`
    }
  }
  else if (/(?:alt|summary)$/i.test(name)) {
    r = fakeParagraph(rnd, 1, 2)
  }
  else {
    r = fakeParagraph(rnd, 3, 10)
  }
  return r
}

function fakeObject(rnd, schema, stack = []) {
  const ret = {}
  const fields = schema.required || []
  fields.forEach((key) => {
    const field = schema.properties[key]
    if (field.type === 'array') {
      // N many items should generate (this can be min/maxed by params)
      ret[key] = range(1 + Math.floor(rnd.random() * 4)).map(() => fakeObject(rnd, field.items, stack.concat([key])))
    }
    else if (!field.type || field.type === 'object') {
      const obj = fakeObject(rnd, field, stack.concat([key]))
      ret[key] = obj
      if (field.additionalProperties) {
        range(1 + Math.floor(rnd.random() * 3)).map(() => (
          obj[fakeId(rnd)] = fakeObject(rnd, field.additionalProperties, stack.concat([key]))
        ))
      }
    }
    else if (field.type === 'string') {
      ret[key] = fakeString(rnd, key, stack.concat([key]))
    }
    else {
      console.error(`Encountered unsupported field type: ${field.type}`)
    }
  })
  return ret
}


module.exports = function (contractsFolder) {
  const server = new swagger.Server()

  glob.sync(`${contractsFolder}/**/*.yml`).forEach(contractFileName => {
    server.parse(contractFileName)
    swaggerParser.validate(contractFileName)
      .then(api => {
        for (const pathKey of api.paths) {
          const apiMethod = api.paths[pathKey]
          for (const method of apiMethod) {
            server[method](api.basePath + pathKey, (req, res) => {
              // use a consistent seed throughout the response to ensure deterministic responses
              const seed = seedFrom(req.url)
              res.header('X-FakeAPI-seed', seed)

              const apiRes = apiMethod[method].responses[200]

              // fabricate headers
              const headRand = getRandomizer(seed)
              for (const header of apiRes.headers) {
                const headerval = fakeString(headRand, header)
                res.header(header, headerval)
              }

              // fabricate headers
              const bodyRand = getRandomizer(seed)
              const body = fakeObject(bodyRand, apiRes.schema, [pathKey])
              res.send(body)
            })
          }
        }
      })
      .catch((err) => console.error(`Onoes! The API is invalid. ${err.message}`))
  })

  const port = process.env.PORT || 8000
  server.listen(port, () => console.log(`The Swagger server is now running at //localhost:${port}`))

  return server
}
