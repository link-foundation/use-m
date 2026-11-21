const assert: typeof import('node:assert/strict') = require('node:assert/strict')
const { use, makeUse }: typeof import('use-m') = require('use-m')

async function main() {
  const helper = await use<typeof import('./helper.mts')>('./helper.mts')
  assert.equal(helper.answer, 42)

  const localUse = await makeUse()
  assert.equal((await localUse<typeof helper>('./helper.mts')).answer, 42)
  const [first, second] = await use.all<[typeof helper, typeof helper]>('./helper.mts', './helper.mts')
  assert.equal(first.answer, 42)
  assert.equal(second.answer, 42)
}

main().catch((error: unknown) => {
  console.error(error)
  process.exitCode = 1
})
