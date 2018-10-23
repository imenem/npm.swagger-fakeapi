module.exports = {
  parser: 'babel-eslint',
  extends: [
    'eslint-config-icelandair/basic'
  ],
  rules: {
    'no-lonely-if': 'error',
    'brace-style': ['error', 'stroustrup', { 'allowSingleLine': true }],
    'object-shorthand': 'off',
    'no-use-before-define': 'off',
    'no-underscore-dangle': 'off',
    'no-console': 'off'
  },
  env: {
    browser: true,
    node: true,
    jest: true
  }
}
