// Source fragment: resolver chains and concurrent npm install coordination.
// Generated bundles concatenate this file; do not import it directly.

// Ordered chains of universal-ESM CDN resolvers tried for network/CDN loading.
// Each entry is a key into `resolvers`; the chains list *distinct* CDN hosts so a
// single CDN outage no longer breaks `use()` — when the first host fails we fall
// back to the next. The primary entry preserves the previous default per runtime.
const networkResolverChain = ['esm', 'jspm', 'skypack']
const denoResolverChain = ['deno', 'jspm', 'skypack']

// npm installs for the same alias must not overlap. `npm install -g` takes no
// lock on the global prefix, so two runs writing the same alias directory delete
// and re-extract each other's trees — the loser fails with ENOTEMPTY, and, worse,
// a caller that saw no error at all can import a half-written tree. Node
// evaluates sibling top-level-await subgraphs concurrently, so a project whose
// modules all open with `await use('some-package')` starts exactly that wave on
// every cold run (issue #70). These maps collapse the wave inside one process;
// the alias lock in the npm resolver covers separate processes.
const npmInstallsInFlight = new Map()
const npmInstallQueues = new Map()
const npmLatestVersionMemoryCache = new Map()
const npmEnvIds = new WeakMap()
let npmEnvId = 0

// A stable id per npm environment object. Calls that share an environment (the
// usual `process.env`) share coordination keys, while calls given explicitly
// different environments — different npm prefixes, hence different install
// directories — never collapse into each other.
const getNpmEnvId = (env) => {
  if (!env || typeof env !== 'object') {
    return 'env-default'
  }
  let id = npmEnvIds.get(env)
  if (id === undefined) {
    id = `env-${++npmEnvId}`
    npmEnvIds.set(env, id)
  }
  return id
}

// Serialize every install of one alias in this process, so an install and a
// repair of the same directory can never run at the same time.
const queueNpmInstall = (aliasKey, run) => {
  const previous = npmInstallQueues.get(aliasKey) || Promise.resolve()
  const result = previous.then(run, run)
  const tail = result.then(() => {}, () => {})
  npmInstallQueues.set(aliasKey, tail)
  tail.then(() => {
    if (npmInstallQueues.get(aliasKey) === tail) {
      npmInstallQueues.delete(aliasKey)
    }
  })
  return result
}

// Single flight: identical concurrent requests share one install. The entry is
// evicted once it settles, so a genuine failure stays retryable.
const dedupeNpmInstall = (requestKey, aliasKey, run) => {
  const pending = npmInstallsInFlight.get(requestKey)
  if (pending) {
    return pending
  }
  const promise = queueNpmInstall(aliasKey, run)
  npmInstallsInFlight.set(requestKey, promise)
  const forget = () => {
    if (npmInstallsInFlight.get(requestKey) === promise) {
      npmInstallsInFlight.delete(requestKey)
    }
  }
  promise.then(forget, forget)
  return promise
}

let npmImportRecoveryId = 0

const isRecoverableNpmImportError = (error, modulePath) => {
  if (error?.message !== `Failed to import module from '${modulePath}'.`) {
    return false
  }
  const cause = error.cause
  return cause?.name === 'SyntaxError' ||
    cause?.code === 'ERR_INVALID_PACKAGE_CONFIG' ||
    cause?.code === 'ERR_MODULE_NOT_FOUND'
}

const cacheBustNpmModulePath = async (modulePath) => {
  const { pathToFileURL } = await import('node:url')
  const moduleUrl = pathToFileURL(modulePath)
  moduleUrl.searchParams.set('use-m-retry', String(++npmImportRecoveryId))
  return moduleUrl.href
}

// Normalize a resolver reference (a resolver function, or a key into `resolvers`)
// into a resolver function.
const toResolverFunction = (resolver) =>
  typeof resolver === 'function' ? resolver : resolvers[resolver]
