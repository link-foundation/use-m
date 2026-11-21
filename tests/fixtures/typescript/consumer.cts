import useM = require('use-m')
import explicitUse = require('use-m/use.cjs')
import bootstrap = require('use-m/load')
import explicitBootstrap = require('use-m/load.cjs')
import polyfill = require('use-m/fetch-polyfill')
import jsPolyfill = require('use-m/fetch-polyfill.js')
import cjsPolyfill = require('use-m/fetch-polyfill.cjs')

const use: typeof useM.use = explicitUse.use
const loadUseM: typeof bootstrap.loadUseM = explicitBootstrap.loadUseM
const fetchers: Array<typeof polyfill.fetch> = [jsPolyfill.fetch, cjsPolyfill.fetch, polyfill.default]

const untyped = useM.use('untyped')
// @ts-expect-error Runtime-selected module shapes must be narrowed or supplied explicitly
const unchecked: Promise<string> = untyped
// @ts-expect-error Polyfill exports an object in CommonJS
polyfill('https://example.com')
