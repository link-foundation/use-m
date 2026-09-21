import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'

const implementation = process.argv[2] || 'mjs'
let makeUse

if (implementation === 'cjs') {
  ({ makeUse } = createRequire(import.meta.url)('../../../src/use.cjs'))
} else if (implementation === 'universal') {
  // eslint-disable-next-line no-eval
  const universal = eval(await readFile(new URL('../../../src/use.js', import.meta.url), 'utf8'))
  makeUse = universal.makeUse
} else {
  ({ makeUse } = await import('../../../src/use.mjs'))
}

const fixtureUrl = new URL('./outer.cjs', import.meta.url).href
const load = await makeUse({ specifierResolver: () => fixtureUrl })
const loaded = await load('callable-commonjs-fixture')

process.stdout.write(JSON.stringify({
  type: typeof loaded,
  result: typeof loaded === 'function' ? loaded() : null,
  attachedType: typeof loaded?.attached,
  attachedResult: typeof loaded?.attached === 'function' ? loaded.attached() : null
}))
