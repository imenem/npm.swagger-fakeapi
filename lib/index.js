const express = require('express')
const entries = require('./entries')

module.exports = (opt = {}) => {
  const options = Object.assign({
    autostart: true,
    port: process.env.PORT || 8000,
    contracts: '',
  }, opt)

  if (!options.contracts) {
    throw new Error('No contracts provided')
  }
  const promise = require('./server')(options.contracts).then((servers) => {
    const app = express()
    for (const [, server] of entries(servers)) {
      app.use(server.app)
    }

    if (options.autostart) {
      app.listen(options.port, () => {
        console.log(`[swagger-fakeapi] The Swagger server is now running at //localhost:${options.port}`)
      })
    }

    return app
  }).catch((err) => console.error(err))

  return promise
}
