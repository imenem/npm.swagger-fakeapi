module.exports = (contractsFolder) => {
  const server = require('./server')(contractsFolder)

  const port = process.env.PORT || 8000
  server.listen(port, () => console.log(`The Swagger server is now running at //localhost:${port}`))

  return server
}
