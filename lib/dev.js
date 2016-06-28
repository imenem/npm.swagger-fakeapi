const path = require('path')
require('.')({
  autostart: true,
  contracts: path.resolve(__dirname, '../contracts/**/*.yml'),
})
