// Source fragment: resolver chains and concurrent npm install coordination.
// Generated bundles concatenate this file; do not import it directly.

// Ordered chains of universal-ESM CDN resolvers tried for network/CDN loading.
// Each entry is a key into `resolvers`; the chains list *distinct* CDN hosts so a
// single CDN outage no longer breaks `use()` — when the first host fails we fall
// back to the next. The primary entry preserves the previous default per runtime.
const networkResolverChain = ['esm', 'jspm', 'skypack']
// Deno's own npm: support comes last: it only runs when every CDN failed to
// build the package (for example a release whose engines exclude the CDN's
// Node.js), so packages that loaded before keep loading from the same place.
const denoResolverChain = ['deno', 'jspm', 'skypack', 'denoNpm']

// Share one size limit and one expiry timer across all loaders in this bundle.
// Insertion order lets the timer remove expired entries without scanning hits.
const moduleCache = new Map()
const moduleCacheLimit = 256
const moduleCacheTtlMs = 60_000
let moduleCacheTimer
const moduleCacheNow = typeof performance !== 'undefined' && typeof performance?.now === 'function'
  ? performance.now.bind(performance)
  : Date.now

const scheduleModuleCacheExpiry = (delay) => {
  moduleCacheTimer = setTimeout(() => {
    moduleCacheTimer = undefined
    const now = moduleCacheNow()
    for (const [key, entry] of moduleCache) {
      if (entry.expiresAt > now) {
        scheduleModuleCacheExpiry(entry.expiresAt - now)
        break
      }
      moduleCache.delete(key)
    }
  }, delay)
  moduleCacheTimer?.unref?.()
  if (typeof Deno !== 'undefined' && typeof moduleCacheTimer === 'number') {
    Deno.unrefTimer?.(moduleCacheTimer)
  }
}

const getModuleCacheEntry = (key) => {
  const entry = moduleCache.get(key)
  return entry && entry.expiresAt > moduleCacheNow() ? entry : undefined
}

const cacheModule = (key, value, inputs) => {
  const entry = { value, inputs, expiresAt: moduleCacheNow() + moduleCacheTtlMs }
  moduleCache.delete(key)
  moduleCache.set(key, entry)
  if (moduleCache.size > moduleCacheLimit) {
    moduleCache.delete(moduleCache.keys().next().value)
  }
  if (moduleCacheTimer === undefined) {
    scheduleModuleCacheExpiry(moduleCacheTtlMs)
  }
  return entry
}

const reuseModuleLoad = (key, load, inputs) => {
  const cached = getModuleCacheEntry(key)
  if (cached && (!inputs || (cached.inputs?.length === inputs.length &&
      inputs.every((value, index) => Object.is(value, cached.inputs[index]))))) {
    return cached.value
  }

  const pending = Promise.resolve().then(load)
  const entry = cacheModule(key, pending, inputs)
  pending.catch(() => {
    if (moduleCache.get(key) === entry) moduleCache.delete(key)
  })
  return pending
}

let moduleLoaderId = 0
const packageCacheOptions = new Set(['scriptPath', 'meta', 'specifierResolver', 'specifierResolvers'])
let localPackageContext
let localPackageContextId = 0

const getPackageCacheKey = (loaderId, moduleSpecifier, resolverChain) => {
  let contextId = 0
  if ((resolverChain.includes('npm') || resolverChain.includes('bun')) &&
      typeof process !== 'undefined' && typeof process.cwd === 'function' && process.env) {
    // npm and Bun can resolve a different install root after a cwd or env
    // change. Calls with explicit resolver options bypass this cache entirely.
    const { env } = process
    const context = JSON.stringify([process.cwd(), env.PATH, env.HOME, env.USERPROFILE, env.XDG_CACHE_HOME,
      env.BUN_INSTALL, env.npm_config_prefix, env.NPM_CONFIG_PREFIX,
      env.npm_config_registry, env.NPM_CONFIG_REGISTRY, env.USE_M_ENGINE_STRICT,
      env.npm_config_userconfig, env.NPM_CONFIG_USERCONFIG,
      env.npm_config_globalconfig, env.NPM_CONFIG_GLOBALCONFIG])
    if (context !== localPackageContext) {
      localPackageContext = context
      localPackageContextId++
    }
    contextId = localPackageContextId
  }
  return JSON.stringify(['package', loaderId, moduleSpecifier, resolverChain, contextId])
}

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
const toResolverFunction = (resolver) => {
  if (typeof resolver === 'function') return resolver
  if (typeof resolver === 'string' &&
      Object.prototype.hasOwnProperty.call(resolvers, resolver) &&
      typeof resolvers[resolver] === 'function') {
    return resolvers[resolver]
  }
  throw new TypeError(`Unknown resolver '${String(resolver)}'.`)
}
