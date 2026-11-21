const { pathToFileURL } = require('node:url')
const { describe, test, expect } = require('../src/test-adapter.cjs')
const { testModuleCache } = require('./fixtures/module-cache.cjs')

testModuleCache({ describe, test, expect }, require('../use.cjs'), pathToFileURL(require.resolve('../use.cjs')).href)
