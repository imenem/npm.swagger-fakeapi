const range = require('array-range')


const syll = ['na', 'ni', 'no', 'ma', 'mi', 'my', 'de', 'ba', 'be', 'bu', 'ko',
              'ke', 'so', 'sy', 'ru', 'ra', 're', 'wo', 'wu', 'fe', 'fo', 'fi']
function fakeWord(rnd, scount) {
  const sc = scount || 1 + Math.floor(rnd.random() * 4)
  const w = range(sc).map(() => syll[Math.floor(rnd.random() * syll.length)]).join('')
  return w[0].toUpperCase() + w.slice(1).toLowerCase()
}

const types = ['red', 'yellow', 'blue', 'green', 'pink']
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


const phonePatterns = [
  '(###) ###-##-##',
  '07#### ######',
  '+9# ## ########',
  '08##-##-####',
  '(###) ###-####',
  '+## (#) ### ###',
]
function fakePhoneNumber(rnd) {
  const patt = phonePatterns[Math.floor(rnd.random() * phonePatterns.length)]
  return patt.replace(/#/g, () => Math.round(rnd.random() * 9))
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


function fakeEmail(rnd, min = 0, max = 5) {
  return `${fakeSlug(rnd, min||1, max||2)}@example.com`
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


function fakeDate(rnd, min, max) {
  return fakeTime(rnd).split('T')[0]
}


const locales = ['en', 'fr', 'es', 'ru', 'se']
function fakeLocale(rnd) {
  return locales[Math.floor(rnd.random() * locales.length)]
}


const currencies = ['EUR', 'USD', 'GBP', 'ISK', 'SEK']
function fakeCurrency(rnd) {
  return currencies[Math.floor(rnd.random() * currencies.length)]
}


function fakeUrl(rnd, min, max) {
  return `//localhost${fakePath(rnd, min, max)}`
}


function fakeImageUrl(rnd, min, max) {
  const w = 700 + Math.floor(rnd.random() * 4) * 100
  const h = 700 + Math.floor(rnd.random() * 4) * 100
  return `https://placekitten.com/${w}/${h}`
}



function fakeString(name, contextString) {
  if (/(?:nationality|location|language|language)(id|code)?s?$/i.test(name)) {
    return 'locale'
  }
  else if (/(?:ids?|codes?|seats?)$/i.test(name)) {
    return 'id'
  }
  else if (/(?:usernames?)$/i.test(name)) {
    return 'slug'
  }
  else if (/(?:email)s?$/i.test(name)) {
    return 'email'
  }
  else if (/(?:name)s?$/i.test(name)) {
    return /\b(user)s?\b/i.test(contextString) ? 'title' : 'slug'
  }
  else if (/(?:slug|key)s?$/i.test(name)) {
    return 'slug'
  }
  else if (/(?:country)s?$/i.test(name)) {
    return 'country'
  }
  else if (/(?:city)s?$/i.test(name)) {
    return 'city'
  }
  else if (/(?:content|body|text)s?$/i.test(name)) {
    return 'paragraph'
  }
  else if (/(?:time)s?/i.test(name)) {
    return 'time'
  }
  else if (/(?:date)s?/i.test(name)) {
    return 'date'
  }
  else if (/(?:gender|sex?)$/i.test(name)) {
    return 'type'
  }
  else if (/(?:types?|class(?:es)?|categor(?:y|ies)|\btags?)$/i.test(name)) {
    return 'type'
  }
  else if (/(?:title)s?$/i.test(name)) {
    return 'title'
  }
  else if (/(?:phone|tel)[\-_]?(num|number)?s?$/i.test(name)) {
    return 'phoneNumber'
  }
  else if (/(?:currency)s?$/i.test(name)) {
    return 'currency'
  }
  else if (/(?:path|pathname)s?$/i.test(name)) {
    return 'path'
  }
  else if (/(?:img|images?)(ur[il]s?)?$/i.test(name)) {
    return 'imageUrl'
  }
  else if (/(?:ur[il]s?)$/i.test(name)) {
    return 'url'
  }
  else if (/(?:\balt|summary)$/i.test(name)) {
    return 'paragraph'
  }
  return 'title'
}




exports.word = fakeWord
exports.type = fakeType
exports.id = fakeId
exports.title = fakeTitle
exports.paragraph = fakeParagraph
exports.path = fakePath
exports.phoneNumber = fakePhoneNumber
exports.email = fakeEmail
exports.country = fakeCountry
exports.city = fakeCity
exports.locale = fakeLocale
exports.currency = fakeCurrency
exports.slug = fakeSlug
exports.boolean = fakeBoolean
exports.number = fakeNumber
exports.integer = fakeInteger
exports.time = fakeTime
exports.date = fakeDate
exports.url = fakeUrl
exports.imageUrl = fakeImageUrl
exports.guessStringFormat = fakeString

