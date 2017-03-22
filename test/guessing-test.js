/* eslint-disable arrow-body-style, prefer-rest-params, max-len */

const test = require('ava')
const path = require('path')
const guessFormat = require(path.resolve(__dirname, '../lib/fake')).guessStringFormat
const fieldHandler = require(path.resolve(__dirname, '../lib/server')).fieldHandler

function randomizer() {
  const seq = arguments.length ? Array.from(arguments) : [0.7]
  let pos = 0
  return { random: () => seq[(pos++) % seq.length] }
}

test('fieldHandler boolean', t => {
  const field = { type: 'boolean' }
  t.is(typeof fieldHandler(randomizer(), '', field), 'boolean', 'is correct type')
  t.is(fieldHandler(randomizer(), '', field), true, 'is predictable')
})

test('fieldHandler number', t => {
  const caller = field => fieldHandler(randomizer(), '', field)
  t.is(typeof caller({ type: 'number' }), 'number', 'is correct type')
  t.is(caller({ type: 'number' }), 7, 'is predictable')
  t.is(caller({ type: 'number', enum: [1234], default: 256 }), 1234, 'uses enum as a first choice')
  t.is(caller({ type: 'number', default: 256 }), 256, 'uses default as a second choice')
  t.is(caller({ type: 'number', minimum: 256 }), 256, 'respects minimum')
  t.is(caller({ type: 'number', maximum: 2 }), 1.4, 'respects maximum')
})

test('fieldHandler integer', t => {
  const caller = field => fieldHandler(randomizer(), '', field)
  t.is(typeof caller({ type: 'integer' }), 'number', 'is correct type')
  t.is(caller({ type: 'integer' }), 7, 'is predictable')
  t.is(caller({ type: 'integer', enum: [1234], default: 256 }), 1234, 'uses enum as a first choice')
  t.is(caller({ type: 'integer', default: 256 }), 256, 'uses default as a second choice')
  t.is(caller({ type: 'integer', minimum: 256 }), 256, 'respects minimum')
  t.is(caller({ type: 'integer', maximum: 2 }), 1, 'respects maximum')
})

test('fieldHandler string', t => {
  const caller = field => fieldHandler(randomizer(), 'slug', field)
  t.is(typeof caller({ type: 'string' }), 'string', 'is correct type')
  t.is(caller({ type: 'string' }), 'quo-asperiores-repellat', 'is predictable')
  t.is(caller({ type: 'string', enum: ['foo'], default: 'foo' }), 'foo', 'uses enum as a first choice')
  t.is(caller({ type: 'string', default: 'foo' }), 'foo', 'uses default as a second choice')
  t.is(caller({ type: 'string', format: 'date' }), '2013-04-22', 'uses format for dates')
  t.is(caller({ type: 'string', format: 'date-time' }), '2013-04-22T02:40:00.000Z', 'uses format for dates')
})

test('guessStringFormat locale', t => {
  t.is(guessFormat('country'), 'locale')
  t.is(guessFormat('CountryCode'), 'locale')
  t.is(guessFormat('user country code'), 'locale')
})

test('guessStringFormat companies', t => {
  t.is(guessFormat('company id'), 'companyId')
  t.is(guessFormat('companyName'), 'companyName')
  t.is(guessFormat('company-name'), 'companyName')
  t.is(guessFormat('company foo name'), 'companyName')
  t.is(guessFormat('company'), 'companyName')
})

test('guessStringFormat slug', t => {
  t.is(guessFormat('slug'), 'slug')
  t.is(guessFormat('content item slug'), 'slug')
  t.is(guessFormat('item key'), 'slug')
  t.is(guessFormat('user key'), 'slug')
  t.is(guessFormat('article slug'), 'slug')
})

test('guessStringFormat date', t => {
  t.is(guessFormat('date'), 'date')
  t.is(guessFormat('publish_date'), 'date')
  t.is(guessFormat('mDate'), 'date')
  t.is(guessFormat('article date'), 'date')
})
