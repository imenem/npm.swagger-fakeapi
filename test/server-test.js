/* eslint-disable arrow-body-style */

const test = require('ava')
const path = require('path')
const request = require('supertest-as-promised')

const mockserver = require(path.resolve(__dirname, '../lib/server'))
const options = {
  contracts: path.resolve(__dirname, './contracts-test/*yml'),
  verbose: false,
}

test('server', t => {
  mockserver(options)
    .then(servers => {
      return request(servers[0].listen(8888)).get('/api/v1/foo/fooId/')
    })
    .then(res => {
      t.is(res.status, 400, 'responds to queries')
    })
})
