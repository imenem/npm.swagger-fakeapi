const express = require('express')
const entries = require('./entries')
const server = require('./server')

module.exports = (opt = {}) => {
  const options = Object.assign({
    autostart: true,
    port: process.env.PORT || 8000,
    contracts: '',
    verbose: true
  }, opt)

  if (!options.contracts) {
    throw new Error('No contracts provided')
  }
  const promise = server(options).then((servers) => {
    const app = express()
    for (const [ , serverInstance ] of entries(servers)) {
      app.use(serverInstance.app)
    }

    if (options.autostart) {
      app.listen(options.port, () => {
        if (options.verbose) {
          console.log(`[swagger-fakeapi] The Swagger server is now running at //localhost:${options.port}`)
        }
      })
    }

    return app
  }).catch((err) => console.error(err))

  return promise
}
