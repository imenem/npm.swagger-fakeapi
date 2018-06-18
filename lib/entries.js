/*
** ES6 Object.entries polyfill
**
** Allows for an ES7 style for...of over objects:
**
**     for (const [key, val] of entries({ a: 1, b: 2 })) {
**      console.log(key, val)
**     }
*/

module.exports = function* entries (obj) {
  for (const d of Object.keys(obj)) {
    yield [ d, obj[d] ]
  }
}
