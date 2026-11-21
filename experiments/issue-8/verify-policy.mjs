import assert from 'node:assert/strict'
import { exec, execFile } from 'node:child_process'
import { once } from 'node:events'
import { mkdir, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const execAsync = promisify(exec)
const execFileAsync = promisify(execFile)
const runNode = (args, options) => execFileAsync(process.execPath, args, options)
const flags = ['--experimental-network-imports', '--experimental-policy']

for (const flag of flags) {
  if (!process.allowedNodeEnvironmentFlags.has(flag)) {
    console.log(`Skipped: Node.js does not support ${flag}`)
    process.exit(0)
  }
}

const bundlePath = fileURLToPath(new URL('../../use.mjs', import.meta.url))
const examplePath = name => fileURLToPath(new URL(`../../examples/network-imports/${name}`, import.meta.url))
const bundle = await readFile(bundlePath)
const temp = await mkdtemp(join(await realpath(tmpdir()), 'use-m policy '))
const env = { ...process.env, npm_config_prefix: temp, npm_config_offline: 'true' }
let tampered = false
const server = createServer((request, response) => {
  if (request.url !== '/use.mjs') {
    response.writeHead(404).end()
    return
  }
  response.setHeader('Content-Type', 'text/javascript')
  response.end(tampered ? Buffer.concat([bundle, Buffer.from('\n// modified')]) : bundle)
})

try {
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const url = `http://127.0.0.1:${server.address().port}/use.mjs`
  const { stdout } = await execAsync('npm root -g', { env })
  const npmRoot = stdout.trim()
  const cjs = join(npmRoot, 'policy-cjs-v-1.0.0')
  const esm = join(npmRoot, 'policy-esm-v-1.0.0')
  await Promise.all([mkdir(cjs, { recursive: true }), mkdir(esm, { recursive: true })])
  // Seed isolated npm aliases so both the resolver and Node's module loader
  // run normally without contacting a registry.
  await Promise.all([
    writeFile(join(cjs, 'package.json'), JSON.stringify({ name: 'policy-cjs', version: '1.0.0', main: 'index.cjs' })),
    writeFile(join(cjs, 'index.cjs'), "const { basename } = require('node:path'); module.exports = { [basename(__filename, '.cjs')]: 1 }"),
    writeFile(join(esm, 'package.json'), JSON.stringify({ name: 'policy-esm', version: '1.0.0', exports: { '.': './index.mjs', './data.json': './data.json' } })),
    writeFile(join(esm, 'index.mjs'), "export { join as joinPaths } from 'node:path'"),
    writeFile(join(esm, 'data.json'), '{"sample":true}'),
  ])

  const manifestPath = join(temp, 'policy.json')
  const { stdout: manifest } = await runNode([examplePath('create-policy.mjs'), url, bundlePath])
  await writeFile(manifestPath, manifest)
  const entry = examplePath('native-npm.mjs')
  const npmSpecs = ['policy-cjs@1.0.0', 'policy-esm@1.0.0', 'policy-esm@1.0.0/data.json']
  const runExample = (policyFlags) => runNode([flags[0], ...policyFlags, entry, url, ...npmSpecs], { env })

  await assert.rejects(runExample([]), { stderr: /ERR_NETWORK_IMPORT_DISALLOWED/ })
  const policyFlags = [`--experimental-policy=${manifestPath}`]
  const { stdout: result } = await runExample(policyFlags)
  assert.deepEqual(result.trim().split(/\r?\n/), [
    'policy-cjs@1.0.0 index',
    'policy-esm@1.0.0 joinPaths',
    'policy-esm@1.0.0/data.json sample',
  ])
  const [registryPackage] = process.argv.slice(2)
  if (registryPackage) {
    const { stdout: exports } = await runNode([flags[0], ...policyFlags, entry, url, registryPackage], {
      env: { ...env, npm_config_offline: 'false' },
    })
    process.stdout.write(exports)
  }
  tampered = true
  await assert.rejects(runExample(policyFlags), { stderr: /ERR_MANIFEST_ASSERT_INTEGRITY/ })
  console.log('Verified policy-backed native npm imports')
} finally {
  server.close()
  await rm(temp, { recursive: true, force: true })
}
