import assert from 'node:assert/strict'
import { makeUse, use } from 'use-m'

const helper = await use<typeof import('./helper.mts')>('./helper.mts')
assert.equal(helper.answer, 42)

const localUse = await makeUse()
const [first, second] = await use.all<[typeof helper, typeof helper]>('./helper.mts', './helper.mts')
assert.equal(first.answer, 42)
assert.equal(second.answer, 42)
assert.equal((await localUse<typeof helper>('./helper.mts')).answer, 42)
