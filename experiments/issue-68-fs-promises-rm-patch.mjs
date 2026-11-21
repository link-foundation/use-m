import { createRequire, syncBuiltinESMExports } from 'node:module'

const require = createRequire(import.meta.url)
const fsPromises = require('node:fs/promises')
const originalRm = fsPromises.rm
const calls = []

fsPromises.rm = async (...args) => {
  calls.push(args)
}
syncBuiltinESMExports()

try {
  const { rm } = await import('node:fs/promises')
  await rm('/tmp/use-m-issue-68-experiment', { recursive: true, force: true })
  console.log(JSON.stringify(calls))
} finally {
  fsPromises.rm = originalRm
  syncBuiltinESMExports()
}
