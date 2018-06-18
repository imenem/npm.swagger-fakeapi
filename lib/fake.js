const range = require('array-range')
const faker = require('faker')
const entries = require('./entries')

const types = ['delta', 'lima', 'tango', 'zulu', 'kilo']
function fakeType(rnd) {
  return types[Math.floor(rnd.random() * types.length)]
}

const alphanum = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
function fakeId(rnd, min, max) {
  let id = ''
  let count
  let rMin = min || 0
  let rMax = max || 24
  if (!rMin) {
    // try to provide at least 4 chars
    rMin = Math.min(4, rMax)
  }
  if (rMin <= 8 && rMax >= 8) {
    // if can it be 8 chars long, then it will be!
    count = 8
  }
  else {
    // if it can't be 8, then try "few"
    if ((rMax - rMin) > 24) {
      rMax = rMin + 8
    }
    count = fakeInteger(rnd, rMin, rMax)
  }
  while (count--) {
    id += alphanum[fakeInteger(rnd, 0, alphanum.length)]
  }
  return id
}

function fakeUuid (rnd, min, max) {
  return 'xxxxxxxx-xxxx-4xxx-bxxx-xxxxxxxxxxxx'.replace(/x/g, () => {
    return Math.floor(rnd.random() * 16).toString(16)
  })
}

function fakePath(rnd) {
  faker.seed(rnd.random() * 1e8)
  const pathname = range(1 + Math.floor(rnd.random() * 4)).map(() => faker.lorem.word(rnd).toLowerCase())
  return `/${pathname.join('/')}/`
}


function fakeNumber(rnd, min = 0, max = 10) {
  return Math.round(1000 * (rnd.random() * Math.max((max || min) - min, 0) + min)) / 1000
}


function fakeInteger(rnd, min = 0, max = 5) {
  return Math.floor(fakeNumber(rnd, min, max))
}


function fakeTime(rnd) {
  return new Date(Math.floor((rnd.random() * 6e11) + (1 * new Date(2000, 0, 0)))).toISOString()
}


function fakeDate(rnd) {
  return fakeTime(rnd).split('T')[0]
}


function fakeImageUrl(rnd) {
  const w = 500 + Math.floor(rnd.random() * 8) * 50
  const h = 500 + Math.floor(rnd.random() * 8) * 50
  return `//loremflickr.com/${w}/${h}`
}


function fakeHTML(rnd) {
  faker.seed(rnd.random() * 1e8)
  const text = faker.lorem.paragraphs()
  return text.split(/\n/g).map(d => {
    const p = d.trim().split(/ /)
    let r = Math.round(rnd.random() * 5)
    while (r-- > 0) {
      const t = Math.floor(rnd.random() * p.length)
      if (!/^</.test(p[t])) {
        const tag = rnd.random() > 0.25 ? 'em' : 'strong'
        p[t] = `<${tag}>${p[t]}</${tag}>`
      }
    }
    return `<p>${p.join(' ')}</p>`
  }).join('\n')
}


function fakeString(context) {
  const tokens = context
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .toLowerCase()
        .split(/[^a-zA-Z0-9À-ÖØ-öø-ÿ]/)

  const grades = {}
  const grade = (id, score) => {
    grades[id] = (grades[id] || 0) + score
  }
  tokens.forEach((token, place) => {
    if (/(?:nationality|location|language|language|country)(id|code)?s?$/i.test(token)) {
      grade('locale', 10)
    }
    else if (/(?:[ug]uids?|tokens?)$/i.test(token)) {
      grade('uuid', 10)
    }
    else if (/(?:ids?|codes?)$/i.test(token)) {
      grade('id', 2)
      grade('companyId', 2)
    }
    else if (/(?:email)s?$/i.test(token)) {
      grade('email', 10)
    }
    else if (/(?:name)s?$/i.test(token)) {
      const last = tokens[place - 1] || ''
      if (last === 'first' || last === 'middle') {
        grade('firstName', 10)
      }
      else if (last === 'last' || last === 'sur') {
        grade('lastName', 10)
      }
      else {
        grade('name', 10)
      }
      grade('companyName', 4)
    }
    else if (/(?:compan(?:y|ies))$/i.test(token)) {
      grade('companyName', 9)
      grade('companyId', 8)
    }
    else if (/(?:slug|key)s?$/i.test(token)) {
      grade('slug', 10)
    }
    else if (/(?:country)s?$/i.test(token)) {
      grade('country', 10)
    }
    else if (/(?:city)s?$/i.test(token)) {
      grade('city', 10)
    }
    else if (/(?:street)s?$/i.test(token)) {
      grade('street', 10)
    }
    else if (/(?:zip)s?$/i.test(token)) {
      grade('zip', 10)
    }
    else if (/(?:summary)s?$/i.test(token)) {
      grade('paragraph', 8)
    }
    else if (/(?:content|body|text)s?$/i.test(token)) {
      grade('paragraphs', 8)
    }
    else if (/(?:time)s?/i.test(token)) {
      grade('dateTime', 10)
    }
    else if (/(?:date)s?/i.test(token)) {
      grade('date', 10)
    }
    else if (/(?:gender|sex?)$/i.test(token)) {
      grade('type', 10)
    }
    else if (/(?:types?|class(?:es)?|categor(?:y|ies)|\btags?)$/i.test(token)) {
      grade('type', 10)
    }
    else if (/(?:title)s?$/i.test(token)) {
      grade('title', 10)
    }
    else if (/(?:phone|tel)[\-_]?(num|number)?s?$/i.test(token)) {
      grade('phoneNumber', 10)
    }
    else if (/(?:currency)s?$/i.test(token)) {
      grade('currency', 10)
    }
    else if (/(?:path|path[\-_]?name)s?$/i.test(token)) {
      grade('path', 10)
    }
    else if (/(?:img|pictures?|images?)$/i.test(token)) {
      grade('imageUrl', 10)
    }
    else if (/(?:ur[il]s?)$/i.test(token)) {
      grade('imageUrl', 2)
      grade('url', 10)
    }
    else if (/(?:\balt|summary)$/i.test(token)) {
      grade('paragraph', 10)
    }
  })
  const best = Array.from(entries(grades)).sort((a, b) => b[1] - a[1])[0]
  return (best) ? best[0] : 'title'
}

function wrapFaker(fn) {
  return (rnd) => {
    const seed = Math.floor(rnd.random() * 1e8)
    // faker nukes the seed if it is falsy:
    faker.seed(seed + 1)
    return fn()
  }
}

// numberical
exports.boolean = rnd => rnd.random() > 0.5

exports.number = fakeNumber
exports.integer = fakeInteger

// taxonomy
exports.id = fakeId
exports.uuid = fakeUuid
exports.companyId = fakeId
exports.type = fakeType

// text
exports.word = wrapFaker(faker.lorem.word)
exports.title = wrapFaker(faker.lorem.sentence)
exports.paragraph = wrapFaker(faker.lorem.paragraph)
exports.paragraphs = wrapFaker(faker.lorem.paragraphs)
exports.html = fakeHTML

// identity
exports.name = wrapFaker(faker.name.findName)
exports.firstName = wrapFaker(faker.name.firstName)
exports.middleName = wrapFaker(faker.name.firstName)
exports.lastName = wrapFaker(faker.name.lastName)
exports.email = wrapFaker(faker.internet.exampleEmail)
exports.phoneNumber = wrapFaker(faker.phone.phoneNumber)
exports.companyName = wrapFaker(faker.company.companyName)

// address
exports.country = wrapFaker(faker.address.country)
exports.city = wrapFaker(faker.address.city)
exports.street = wrapFaker(faker.address.streetAddress)
exports.zip = wrapFaker(faker.address.zipCode)

// internet
exports.slug = wrapFaker(faker.lorem.slug)
exports.path = fakePath
exports.url = wrapFaker(faker.internet.url)
exports.imageUrl = fakeImageUrl

exports.locale = wrapFaker(faker.random.locale)
exports.currency = wrapFaker(faker.finance.currencyCode)
exports.dateTime = fakeTime
exports.date = fakeDate

//
exports.guessStringFormat = fakeString

