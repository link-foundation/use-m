#!/usr/bin/env node

import { performance } from 'node:perf_hooks'
import { use } from '../use.mjs'

const load = async () => {
  const start = performance.now()
  const lodash = await use('lodash@4.17.21')
  return { lodash, elapsed: performance.now() - start }
}

const first = await load()
const second = await load()

console.log(`First load took ${first.elapsed.toFixed(2)} ms`)
console.log(`Repeated load took ${second.elapsed.toFixed(2)} ms`)
console.log(`Both calls returned the same module object: ${first.lodash === second.lodash}`)
