import { makeUse } from '../../../src/use.mjs'

const fixtureUrl = new URL('./outer.cjs', import.meta.url).href
const load = await makeUse({ specifierResolver: () => fixtureUrl })
const loaded = await load('callable-commonjs-fixture')

process.stdout.write(JSON.stringify({
  type: typeof loaded,
  result: typeof loaded === 'function' ? loaded() : null,
  attachedType: typeof loaded?.attached,
  attachedResult: typeof loaded?.attached === 'function' ? loaded.attached() : null
}))
