module.exports = (contractsFolder) => {
  const server = require('./server')(contractsFolder)

  return server
}
