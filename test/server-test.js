const test = require('ava')
const path = require('path')
const request = require('supertest-as-promised')

const server = require(path.resolve(__dirname, '../lib/server'))(path.resolve(__dirname, './contracts-test'))

test('/api/v1/foo/fooId returns 400 status code', async t => {
  const res = await request(server.listen()).get('/api/v1/foo/fooId')

  t.is(res.status, 400)
})
