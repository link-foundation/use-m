// Source fragment: built-in, npm, Bun, Deno, and CDN resolvers.
// Generated bundles concatenate this file; do not import it directly.

const resolvers = {
  builtin: async (moduleSpecifier, pathResolver) => {
    const { packageName, modulePath } = parseModuleSpecifier(moduleSpecifier);

    // Handle built-in modules with subpaths like 'node:fs/promises'
    const hasNodePrefix = packageName.startsWith('node:');
    const moduleName = (hasNodePrefix ? packageName.slice(5) : packageName) + modulePath;

    // Determine environment
    const isBrowser = typeof window !== 'undefined';
    const environment = isBrowser ? 'browser' : 'node';

    const moduleFactory = builtinOverrides[moduleName]?.[environment];
    if (moduleFactory) {
      try {
        // Execute the factory function to get the module
        return await moduleFactory();
      } catch (error) {
        throw new Error(`Failed to load built-in module '${moduleName}' in ${environment} environment.`, { cause: error });
      }
    }

    if (isBrowser) {
      // No browser implementation: report the well-known Node.js-only built-ins
      // explicitly and let every other specifier fall through to the resolvers
      // that fetch packages from a CDN.
      if (browserUnavailableBuiltins.has(moduleName)) {
        throw new Error(`Built-in module '${moduleName}' is not available in ${environment} environment.`);
      }
      return null;
    }

    // Ask the runtime whether this is a built-in, matching how the runtime
    // itself resolves the specifier: 'node:sqlite' and 'node:test' are built-in
    // only with the prefix, so bare 'sqlite' or 'test' must stay npm packages.
    if (!await isBuiltinModule(hasNodePrefix ? `node:${moduleName}` : moduleName)) {
      // Not a built-in module
      return null;
    }

    try {
      return await loadBuiltinModule(moduleName);
    } catch (error) {
      throw new Error(`Failed to load built-in module '${moduleName}' in ${environment} environment.`, { cause: error });
    }
  },
  relative: async (moduleSpecifier, pathResolver, callerContext) => {
    // Check if this is a relative path (supports any depth: ./, ../, ../../, etc.)
    if (!moduleSpecifier.startsWith('./') && !moduleSpecifier.startsWith('../')) {
      return null;
    }

    // Try to get the caller's URL from the context or stack trace
    let callerUrl = callerContext;
    let resolvedPath = null;

    // If we have a caller URL, resolve relative to it
    if (callerUrl && (callerUrl.startsWith('file://') || callerUrl.startsWith('http://') || callerUrl.startsWith('https://'))) {
      try {
        // Keep URL-based resolution as a URL on every runtime. A pathname such
        // as /C:/... is not a valid native Windows path and breaks Bun imports.
        const url = new URL(moduleSpecifier, callerUrl);
        resolvedPath = url.href;
      } catch (error) {
        // Fallback for non-URL basePath (only for file:// URLs)
        if (callerUrl.startsWith('file://')) {
          const path = await import('node:path');
          const normalizedPath = new URL(callerUrl).pathname;
          resolvedPath = path.resolve(path.dirname(normalizedPath), moduleSpecifier);
        }
      }
    }

    // If we couldn't resolve with URL, try pathResolver
    if (!resolvedPath) {
      if (!pathResolver) {
        throw new Error('Path resolver is required for relative path resolution.');
      }

      try {
        // Use the provided pathResolver to resolve the relative path
        resolvedPath = await pathResolver(moduleSpecifier);
      } catch (error) {
        throw new Error(`Failed to resolve relative path '${moduleSpecifier}'.`, { cause: error });
      }
    }

    // Import the module and return it
    // Check if this is a JSON file and handle it specially
    if (resolvedPath.endsWith('.json')) {
      try {
        // For JSON files, we need to use import assertions
        const module = await import(resolvedPath, { with: { type: 'json' } });
        return module.default || module;
      } catch (error) {
        // Fallback to baseUse if import assertions fail
        return baseUse(resolvedPath);
      }
    }

    return baseUse(resolvedPath);
  },
  npm: async (moduleSpecifier, pathResolver, options = {}) => {
    const path = await import('node:path');
    const { exec } = await import('node:child_process');
    const { createHash } = await import('node:crypto');
    const { promisify } = await import('node:util');
    const { access, mkdir, readFile, readlink, rename, rm, rmdir, stat, unlink, utimes, writeFile } = await import('node:fs/promises');
    const { constants: fsConstants } = await import('node:fs');
    const os = await import('node:os');
    const execAsync = promisify(exec);
    const npmEnvSource = options?.env || process.env;
    const baseNpmEnv = { ...npmEnvSource };
    const installMaxAttempts = Number.isInteger(options?.installMaxAttempts) && options.installMaxAttempts > 0
      ? options.installMaxAttempts
      : 3;
    const installRetryDelayMs = typeof options?.installRetryDelayMs === 'number' && options.installRetryDelayMs >= 0
      ? options.installRetryDelayMs
      : 1000;
    const registryMaxAttempts = Number.isInteger(options?.registryMaxAttempts) && options.registryMaxAttempts > 0
      ? options.registryMaxAttempts
      : 3;
    // Timings of the cross-process install lock (see `acquireInstallLock`).
    const durationOption = (value, fallback) =>
      typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : fallback;
    const registryRetryDelayMs = durationOption(options?.registryRetryDelayMs, 250);
    const registryRequestTimeoutMs = durationOption(options?.registryRequestTimeoutMs, 10000);
    const latestVersionCacheTtlMs = durationOption(options?.latestVersionCacheTtlMs, 300000);
    // How often the lock owner refreshes the lock's mtime.
    const installLockHeartbeatMs = durationOption(options?.installLockHeartbeatMs, 1000);
    // How long a lock may go unrefreshed before a waiter treats it as abandoned.
    const installLockStaleMs = durationOption(options?.installLockStaleMs, 30000);
    // How long a waiter sleeps between acquisition attempts.
    const installLockPollMs = durationOption(options?.installLockPollMs, 100);
    // How long a waiter waits before giving up and installing unlocked.
    const installLockTimeoutMs = durationOption(options?.installLockTimeoutMs, 300000);
    // Escape hatch: `installLock: false` restores the pre-8.15.0 unlocked installs.
    const installLockEnabled = options?.installLock !== false;
    const latestVersionCacheEnabled = options?.latestVersionCache !== false;
    const registryCliFallbackEnabled = options?.registryCliFallback !== false;
    const registryFetch = typeof options?.fetch === 'function'
      ? options.fetch
      : typeof globalThis.fetch === 'function'
        ? globalThis.fetch.bind(globalThis)
        : null;

    const debugSetting = options?.debug ?? baseNpmEnv.USE_M_DEBUG;
    const debugLevel = debugSetting === true || debugSetting === 'true'
      ? 1
      : debugSetting === 'verbose'
        ? 2
        : Number.isFinite(Number(debugSetting))
          ? Math.max(0, Math.min(2, Number(debugSetting)))
          : 0;
    const debugLogger = typeof options?.debugLogger === 'function'
      ? options.debugLogger
      : console.error;
    const debug = (level, message) => {
      if (debugLevel < level) return;
      try {
        debugLogger(`[use-m] ${message}`);
      } catch {
        // Diagnostics must never change resolver behavior.
      }
    };

    const sleep = (milliseconds) => new Promise(resolve => setTimeout(resolve, milliseconds));

    if (!pathResolver) {
      throw new Error('Failed to get the current resolver.');
    }

    const fileExists = async (filePath) => {
      try {
        const stats = await stat(filePath);
        return stats.isFile();
      } catch (error) {
        if (error.code !== 'ENOENT' && error.code !== 'ENOTDIR') {
          throw error;
        }
        return false;
      }
    };

    const directoryExists = async (directoryPath) => {
      try {
        const stats = await stat(directoryPath);
        return stats.isDirectory();
      } catch (error) {
        if (error.code !== 'ENOENT' && error.code !== 'ENOTDIR') {
          throw error;
        }
        return false;
      }
    };

    const tryResolveModule = async (packagePath) => {
      try {
        return await pathResolver(packagePath);
      } catch (error) {
        if (error.code !== 'MODULE_NOT_FOUND') {
          throw new Error(`Failed to resolve module '${packagePath}'`, { cause: error });
        }

        // Attempt to resolve paths like 'yargs@18.0.0/helpers' to 'yargs-v-18.0.0/helpers/helpers.mjs'
        if (await directoryExists(packagePath)) {
          const directoryName = path.basename(packagePath);
          const resolvedPath = await tryResolveModule(path.join(packagePath, directoryName));
          if (resolvedPath) {
            return resolvedPath;
          }

          // Attempt to resolve paths like 'octokit/core@latest' to 'octokit-core-v-latest/dist-src/index.js' (as it written in package.json)
          const packageJsonPath = path.join(packagePath, 'package.json');
          if (await fileExists(packageJsonPath)) {
            const packageJson = await readFile(packageJsonPath, 'utf8');
            const parsed = JSON.parse(packageJson);
            if (Object.prototype.hasOwnProperty.call(parsed, 'exports')) {
              const target = resolvePackageExportTarget(parsed.exports, '.');
              if (typeof target === 'string' && target.startsWith('./')) {
                const updatedPath = path.resolve(packagePath, target);
                return await tryResolveModule(updatedPath);
              }
            }
          }

          return null;
        }

        return null;
      }
    };

    const defaultRegistry = 'https://registry.npmjs.org/';

    const normalizeRegistry = (value) => {
      const registry = new URL(value || defaultRegistry);
      if (registry.protocol !== 'http:' && registry.protocol !== 'https:') {
        throw new Error(`Unsupported npm registry protocol '${registry.protocol}'.`);
      }
      // Fetch rejects URLs containing credentials, and neither cache files nor
      // debug output should ever persist an npm token embedded in the URL. npm
      // itself still receives the unmodified option through npm_config_registry.
      registry.username = '';
      registry.password = '';
      registry.search = '';
      registry.hash = '';
      if (!registry.pathname.endsWith('/')) {
        registry.pathname += '/';
      }
      return registry.href;
    };

    const getRegistry = async (env) => {
      const explicitRegistry = options?.registry ?? options?.npmRegistry;
      if (explicitRegistry) {
        env.npm_config_registry = String(explicitRegistry);
        return normalizeRegistry(explicitRegistry);
      }
      const environmentRegistry = env.npm_config_registry || env.NPM_CONFIG_REGISTRY;
      if (environmentRegistry) {
        return normalizeRegistry(environmentRegistry);
      }
      try {
        debug(2, 'reading registry from npm config');
        const { stdout } = await execAsync('npm config get registry', { env });
        const configuredRegistry = stdout.trim();
        if (configuredRegistry && configuredRegistry !== 'undefined' && configuredRegistry !== 'null') {
          return normalizeRegistry(configuredRegistry);
        }
      } catch (error) {
        debug(1, `npm config registry lookup failed; using the public registry (${error?.message || error})`);
      }
      return defaultRegistry;
    };

    const getLatestVersionCacheDirectory = (env) => {
      if (!latestVersionCacheEnabled) return null;
      if (typeof options?.latestVersionCacheDirectory === 'string') {
        return path.resolve(options.latestVersionCacheDirectory);
      }
      const home = env.HOME || env.USERPROFILE || os.homedir();
      if (!home) return null;
      const cacheHome = env.XDG_CACHE_HOME || path.join(home, '.cache');
      return path.join(cacheHome, 'use-m', 'registry');
    };

    const getLatestVersionCachePath = (cacheDirectory, registry, packageName) => {
      const digest = createHash('sha256')
        .update(JSON.stringify([registry, packageName]))
        .digest('hex');
      return path.join(cacheDirectory, `${digest}.json`);
    };

    const isValidLatestVersionEntry = (entry, registry, packageName) =>
      entry &&
      entry.registry === registry &&
      entry.packageName === packageName &&
      typeof entry.version === 'string' &&
      entry.version.trim() !== '' &&
      typeof entry.fetchedAt === 'number' &&
      Number.isFinite(entry.fetchedAt);

    const readLatestVersionCache = async (registry, packageName, env) => {
      if (!latestVersionCacheEnabled) return null;
      const cacheKey = JSON.stringify([registry, packageName]);
      let cached = npmLatestVersionMemoryCache.get(cacheKey) || null;
      const cacheDirectory = getLatestVersionCacheDirectory(env);
      if (cacheDirectory) {
        const cachePath = getLatestVersionCachePath(cacheDirectory, registry, packageName);
        try {
          const diskEntry = JSON.parse(await readFile(cachePath, 'utf8'));
          if (isValidLatestVersionEntry(diskEntry, registry, packageName)
            && (!cached || diskEntry.fetchedAt > cached.fetchedAt)) {
            cached = diskEntry;
            npmLatestVersionMemoryCache.set(cacheKey, diskEntry);
          }
        } catch {
          // A missing, partial or old cache file is simply a cache miss.
        }
      }
      if (!cached) return null;
      const age = Math.max(0, Date.now() - cached.fetchedAt);
      const fresh = age <= latestVersionCacheTtlMs;
      debug(2, `${fresh ? 'fresh' : 'stale'} latest-version cache hit for ${packageName} (${cached.version})`);
      return { ...cached, fresh };
    };

    const writeLatestVersionCache = async (registry, packageName, version, env) => {
      if (!latestVersionCacheEnabled) return;
      const entry = { registry, packageName, version, fetchedAt: Date.now() };
      const cacheKey = JSON.stringify([registry, packageName]);
      npmLatestVersionMemoryCache.set(cacheKey, entry);
      const cacheDirectory = getLatestVersionCacheDirectory(env);
      if (!cacheDirectory) return;
      const cachePath = getLatestVersionCachePath(cacheDirectory, registry, packageName);
      const temporaryPath = `${cachePath}.${process.pid}.${Date.now()}.${Math.random().toString(16).slice(2)}.tmp`;
      try {
        await mkdir(cacheDirectory, { recursive: true });
        await writeFile(temporaryPath, `${JSON.stringify(entry)}\n`);
        await rename(temporaryPath, cachePath);
        debug(2, `cached latest version for ${packageName} at ${cachePath}`);
      } catch (error) {
        debug(1, `could not persist latest-version cache for ${packageName} (${error?.message || error})`);
        await unlink(temporaryPath).catch(() => {});
      }
    };

    const getRegistryEndpoint = (registry, packageName) =>
      new URL(`${encodeURIComponent(packageName)}/latest`, registry).href;

    const isTransientRegistryFailure = (error) => {
      const status = error?.status;
      return status === 403 || status === 408 || status === 425 || status === 429 || status >= 500;
    };

    const fetchLatestVersion = async (registry, packageName) => {
      if (!registryFetch) {
        throw new Error('This runtime does not provide fetch.');
      }
      const endpoint = getRegistryEndpoint(registry, packageName);
      let lastError;
      for (let attempt = 1; attempt <= registryMaxAttempts; attempt++) {
        let timeout = null;
        const controller = new AbortController();
        try {
          debug(2, `registry attempt ${attempt}/${registryMaxAttempts} for ${packageName} at ${endpoint}`);
          if (registryRequestTimeoutMs > 0) {
            timeout = setTimeout(() => controller.abort(), registryRequestTimeoutMs);
          }
          const registryResponse = await registryFetch(endpoint, {
            headers: { accept: 'application/json' },
            signal: controller.signal,
          });
          if (!registryResponse?.ok) {
            const error = new Error(
              `npm registry returned ${registryResponse?.status || 'an unknown status'} ${registryResponse?.statusText || ''}`.trim()
            );
            error.status = registryResponse?.status;
            throw error;
          }
          const metadata = await registryResponse.json();
          if (typeof metadata?.version !== 'string' || metadata.version.trim() === '') {
            throw new Error('npm registry metadata did not contain a version.');
          }
          return metadata.version.trim();
        } catch (error) {
          lastError = error;
          const retryable = error?.name === 'AbortError' || error?.status === undefined || isTransientRegistryFailure(error);
          if (!retryable || attempt === registryMaxAttempts) break;
          const delay = registryRetryDelayMs * (2 ** (attempt - 1));
          debug(1, `registry attempt ${attempt}/${registryMaxAttempts} failed for ${packageName}; retrying in ${delay}ms (${error?.message || error})`);
          if (delay > 0) await sleep(delay);
        } finally {
          if (timeout) clearTimeout(timeout);
        }
      }
      throw lastError;
    };

    const getLatestVersion = async (packageName, env, installedPackagePath) => {
      const registry = await getRegistry(env);
      const cached = await readLatestVersionCache(registry, packageName, env);
      if (cached?.fresh) return cached.version;

      const failures = [];
      try {
        const version = await fetchLatestVersion(registry, packageName);
        await writeLatestVersionCache(registry, packageName, version, env);
        return version;
      } catch (error) {
        failures.push(error);
        debug(1, `direct registry lookup failed for ${packageName}; trying npm CLI (${error?.message || error})`);
      }

      if (registryCliFallbackEnabled) {
        try {
          const { stdout } = await execAsync(`npm show ${packageName} version`, { env });
          const version = stdout.trim();
          if (!version) throw new Error('npm show returned an empty version.');
          await writeLatestVersionCache(registry, packageName, version, env);
          return version;
        } catch (error) {
          failures.push(error);
          debug(1, `npm CLI latest-version lookup failed for ${packageName} (${error?.message || error})`);
        }
      }

      if (cached) {
        debug(1, `using stale cached latest version ${cached.version} for ${packageName}`);
        return cached.version;
      }
      const installedVersion = installedPackagePath
        ? await getInstalledPackageVersion(installedPackagePath)
        : null;
      if (installedVersion) {
        debug(1, `using installed version ${installedVersion} for unavailable latest metadata of ${packageName}`);
        return installedVersion;
      }

      const cause = failures[failures.length - 1];
      throw new Error(
        `Failed to determine the latest version of '${packageName}' from '${registry}'. ` +
        `Pin a known version, for example '${packageName}@1.2.3', or retry when the registry is available.`,
        { cause }
      );
    };

    const getInstalledPackageVersion = async (packagePath) => {
      try {
        const packageJsonPath = path.join(packagePath, 'package.json');
        const data = await readFile(packageJsonPath, 'utf8');
        const { version } = JSON.parse(data);
        return version;
      } catch {
        return null;
      }
    };

    const getConfiguredNpmPrefix = (env) => env.npm_config_prefix || env.NPM_CONFIG_PREFIX || '';

    const getNpmGlobalRoot = async (env) => {
      debug(2, 'running npm root -g');
      const { stdout: globalModulesPath } = await execAsync('npm root -g', { env });
      const trimmedPath = globalModulesPath.trim();
      if (!trimmedPath) {
        throw new Error('npm root -g returned an empty global root.');
      }
      debug(2, `npm global root is ${trimmedPath}`);
      return trimmedPath;
    };

    const isWritableDirectoryPath = async (directoryPath) => {
      let currentPath = directoryPath;
      while (currentPath && currentPath !== path.dirname(currentPath)) {
        try {
          const stats = await stat(currentPath);
          if (!stats.isDirectory()) {
            return false;
          }
          await access(currentPath, fsConstants.W_OK);
          return true;
        } catch (error) {
          if (error.code === 'ENOENT') {
            currentPath = path.dirname(currentPath);
            continue;
          }
          return false;
        }
      }
      try {
        await access(currentPath, fsConstants.W_OK);
        return true;
      } catch {
        return false;
      }
    };

    const getUseMCachePrefix = (env) => {
      const home = env.HOME || env.USERPROFILE || os.homedir();
      if (!home) {
        return null;
      }
      const cacheHome = env.XDG_CACHE_HOME || path.join(home, '.cache');
      return path.join(cacheHome, 'use-m', 'npm-global');
    };

    const withNpmPrefix = (env, prefix) => {
      const nextEnv = { ...env, npm_config_prefix: prefix };
      const pathKey = Object.keys(nextEnv).find(key => key.toLowerCase() === 'path') || 'PATH';
      const binPath = path.join(prefix, 'bin');
      nextEnv[pathKey] = nextEnv[pathKey]
        ? `${binPath}${path.delimiter}${nextEnv[pathKey]}`
        : binPath;
      return nextEnv;
    };

    const getWritableInstallContext = async (globalModulesPath, env) => {
      if (await isWritableDirectoryPath(globalModulesPath)) {
        return { env, globalModulesPath };
      }

      const configuredPrefix = getConfiguredNpmPrefix(env);
      if (configuredPrefix) {
        throw new Error(
          `The configured npm global root '${globalModulesPath}' is not writable. ` +
          `use-m will not override the configured npm prefix '${configuredPrefix}'. ` +
          `Set npm_config_prefix to a writable directory or make the configured prefix writable.`
        );
      }

      const fallbackPrefix = getUseMCachePrefix(env);
      if (!fallbackPrefix) {
        throw new Error(
          `The npm global root '${globalModulesPath}' is not writable, and use-m could not determine a home directory for its npm cache prefix. ` +
          `Set npm_config_prefix to a writable directory before using npm-backed use-m imports.`
        );
      }

      const fallbackEnv = withNpmPrefix(env, fallbackPrefix);
      debug(1, `npm global root is not writable; using the use-m prefix ${fallbackPrefix}`);
      let fallbackGlobalModulesPath;
      try {
        fallbackGlobalModulesPath = await getNpmGlobalRoot(fallbackEnv);
      } catch (error) {
        throw new Error(`Failed to resolve use-m npm cache root with prefix '${fallbackPrefix}'.`, { cause: error });
      }

      try {
        await mkdir(fallbackGlobalModulesPath, { recursive: true });
      } catch (error) {
        throw new Error(`Failed to create use-m npm cache root '${fallbackGlobalModulesPath}'.`, { cause: error });
      }

      if (!await isWritableDirectoryPath(fallbackGlobalModulesPath)) {
        throw new Error(
          `The npm global root '${globalModulesPath}' is not writable, and the use-m npm cache root '${fallbackGlobalModulesPath}' is not writable. ` +
          `Set npm_config_prefix to a writable directory before using npm-backed use-m imports.`
        );
      }

      return { env: fallbackEnv, globalModulesPath: fallbackGlobalModulesPath };
    };

    // use-m's own bookkeeping inside the npm global root: one lock directory and
    // one completion marker per alias. The directory name starts with a dot so
    // npm skips it while reading the global tree, the same way it skips `.bin`
    // and `.package-lock.json`.
    const getStatePath = (globalModulesPath, fileName) =>
      path.join(globalModulesPath, '.use-m', fileName);
    const getInstallLockPath = (globalModulesPath, alias) =>
      getStatePath(globalModulesPath, `${alias}.lock`);
    const getInstallMarkerPath = (globalModulesPath, alias) =>
      getStatePath(globalModulesPath, `${alias}.installed.json`);

    const readInstallMarker = async (markerPath) => {
      try {
        return JSON.parse(await readFile(markerPath, 'utf8'));
      } catch {
        return null;
      }
    };

    // The marker is written only after `npm install` returned, so — unlike
    // package.json, which npm extracts first — its presence means extraction
    // finished. Writing it is best effort: a read-only global root only loses
    // the fast path, it must not fail the import.
    const writeInstallMarker = async (markerPath, marker) => {
      const temporaryPath = `${markerPath}.${process.pid}.tmp`;
      try {
        await mkdir(path.dirname(markerPath), { recursive: true });
        await writeFile(temporaryPath, `${JSON.stringify(marker)}\n`);
        await rename(temporaryPath, markerPath);
      } catch {
        await unlink(temporaryPath).catch(() => {});
      }
    };

    // Called before the alias tree changes, so no concurrent reader can trust a
    // marker that describes the tree we are about to replace.
    const removeInstallMarker = async (markerPath) => {
      await unlink(markerPath).catch(() => {});
    };

    // `adopt: true` may only be used while holding the alias lock. Without a
    // marker the only evidence available is the tree itself, and every such
    // check is true long before extraction finishes: a directory exists as soon
    // as npm creates it, and package.json carries the final version from the
    // first extracted file onwards. That check-then-act window is how a
    // concurrent caller used to import a half-written tree (issue #70), so
    // outside the lock an unmarked alias counts as not installed and the caller
    // re-checks under the lock instead.
    const isPackageInstalled = async (packagePath, version, latestVersion, markerPath, { adopt = false } = {}) => {
      if (!await directoryExists(packagePath)) {
        return false;
      }
      const marker = await readInstallMarker(markerPath);
      if (marker) {
        return version === 'latest' ? marker.version === latestVersion : true;
      }
      if (!adopt) {
        return false;
      }
      const installedVersion = await getInstalledPackageVersion(packagePath);
      if (version === 'latest' && installedVersion !== latestVersion) {
        return false;
      }
      // An alias installed by an older use-m (or by hand) carries no marker.
      // Adopt it instead of reinstalling, but only once it resolves — a tree
      // left behind by an interrupted install must not be adopted.
      let resolved = null;
      try {
        resolved = await tryResolveModule(packagePath);
      } catch {
        resolved = null;
      }
      if (!resolved) {
        return false;
      }
      await writeInstallMarker(markerPath, {
        alias: path.basename(packagePath),
        version: installedVersion,
        requestedVersion: version,
        adopted: true
      });
      return true;
    };

    const removePackageAlias = async (packagePath, reason) => {
      try {
        await rm(packagePath, {
          recursive: true,
          force: true,
          maxRetries: 5,
          retryDelay: 100
        });
      } catch (error) {
        throw new Error(`Failed to remove ${reason} npm alias '${packagePath}'.`, { cause: error });
      }
    };

    // A cross-process advisory lock over one alias directory. npm takes no lock
    // on the global prefix, so two `npm install -g <alias>` runs delete and
    // re-extract each other's trees; separate processes sharing one prefix (a CI
    // step, a daemon, containers on one volume) need a lock that outlives a
    // single process. `mkdir` is atomic on every filesystem, which is why the
    // lock is a directory rather than a file — the strategy proper-lockfile
    // uses. It is deliberately self-healing: the owner refreshes the mtime, a
    // lock left behind by a crashed owner is stolen once it goes stale, and
    // anything unexpected (an unwritable root, a peer that never finishes)
    // degrades to the previous unlocked behavior instead of hanging.
    const acquireInstallLock = async (lockPath) => {
      const unlocked = { acquired: false, release: async () => {} };
      if (!installLockEnabled) {
        return unlocked;
      }
      try {
        await mkdir(path.dirname(lockPath), { recursive: true });
      } catch {
        return unlocked;
      }
      const startedAt = Date.now();
      for (;;) {
        try {
          await mkdir(lockPath);
        } catch (error) {
          if (error?.code !== 'EEXIST') {
            return unlocked;
          }
          const stats = await stat(lockPath).catch(() => null);
          const expired = Date.now() - startedAt > installLockTimeoutMs;
          if (!stats) {
            // The owner released it between our mkdir and stat, so retry at
            // once — but still honor the deadline, so a peer that keeps
            // recreating the lock cannot spin us forever.
            if (expired) {
              return unlocked;
            }
            continue;
          }
          if (Date.now() - stats.mtimeMs > installLockStaleMs
            && await rmdir(lockPath).then(() => true, () => false)) {
            continue;
          }
          if (expired) {
            return unlocked;
          }
          await sleep(installLockPollMs);
          continue;
        }
        // Keep the mtime fresh so waiters do not mistake a slow install (a cold
        // `npm install -g` can take minutes) for a crashed owner.
        const heartbeat = installLockHeartbeatMs > 0
          ? setInterval(() => {
            const stamp = new Date();
            Promise.resolve(utimes(lockPath, stamp, stamp)).catch(() => {});
          }, installLockHeartbeatMs)
          : null;
        heartbeat?.unref?.();
        let released = false;
        return {
          acquired: true,
          release: async () => {
            if (released) {
              return;
            }
            released = true;
            if (heartbeat) {
              clearInterval(heartbeat);
            }
            await rmdir(lockPath).catch(() => {});
          }
        };
      }
    };

    const withInstallLock = async (lockPath, run) => {
      const lock = await acquireInstallLock(lockPath);
      try {
        return await run(lock.acquired);
      } finally {
        await lock.release();
      }
    };

    const formatInstallFailure = (error) => {
      const output = [error?.stderr, error?.stdout]
        .filter(value => typeof value === 'string' && value.trim())
        .join('\n')
        .trim();
      return output || error?.message || String(error);
    };

    const getInstallErrorText = (error) => [
      error?.stderr,
      error?.stdout,
      error?.message,
      error?.cause?.stderr,
      error?.cause?.stdout,
      error?.cause?.message
    ].filter(value => typeof value === 'string' && value.trim()).join('\n');

    const getOwnedConflictingBinPath = async ({ error, alias, packageName, globalModulesPath }) => {
      const errorText = getInstallErrorText(error);
      const pathMatch = errorText.match(/(?:^|\n)npm error path ([^\r\n]+)/);
      if (!/\bEEXIST\b/.test(errorText) || !pathMatch) {
        return null;
      }

      const binPath = pathMatch[1].trim();
      try {
        const linkTarget = await readlink(binPath);
        const resolvedTarget = path.resolve(path.dirname(binPath), linkTarget);
        const relativeTarget = path.relative(globalModulesPath, resolvedTarget);
        if (!relativeTarget
          || path.isAbsolute(relativeTarget)
          || relativeTarget === '..'
          || relativeTarget.startsWith(`..${path.sep}`)) {
          return null;
        }

        const [ownerAlias] = relativeTarget.split(path.sep);
        const aliasPrefix = `${packageName.replace('@', '').replace('/', '-')}-v-`;
        if (ownerAlias === alias || !ownerAlias.startsWith(aliasPrefix)) {
          return null;
        }

        const ownerPackageJson = JSON.parse(
          await readFile(path.join(globalModulesPath, ownerAlias, 'package.json'), 'utf8')
        );
        return ownerPackageJson.name === packageName ? binPath : null;
      } catch {
        return null;
      }
    };

    const installPackage = async ({ alias, packageName, version, packagePath, installContext, exclusive }) => {
      const failures = [];
      for (let attempt = 1; attempt <= installMaxAttempts; attempt++) {
        try {
          debug(1, `installing ${packageName}@${version} (attempt ${attempt}/${installMaxAttempts})`);
          await execAsync(
            `npm install -g ${alias}@npm:${packageName}@${version}`,
            { env: installContext.env }
          );
          debug(1, `installed ${packageName}@${version} as ${alias}`);
          return;
        } catch (error) {
          let failure = error;
          let details = formatInstallFailure(error);
          const conflictingBinPath = await getOwnedConflictingBinPath({
            error,
            alias,
            packageName,
            globalModulesPath: installContext.globalModulesPath
          });
          if (conflictingBinPath) {
            try {
              await execAsync(
                `npm install -g --force --no-bin-links ${alias}@npm:${packageName}@${version}`,
                { env: installContext.env }
              );
              return;
            } catch (retryError) {
              failure = retryError;
              details += `\nSafe no-bin retry after verified conflict at '${conflictingBinPath}': ${formatInstallFailure(retryError)}`;
            }
          }
          failures.push({ error: failure, details });
          // Removing the shared alias is only safe while we hold its lock.
          // Without the lock this deletes the tree a concurrent installer just
          // wrote successfully, which is what turned a failed install of one
          // caller into an ERR_MODULE_NOT_FOUND of another (issue #70).
          if (exclusive) {
            await removePackageAlias(packagePath, 'incomplete');
          }
          if (attempt < installMaxAttempts && installRetryDelayMs > 0) {
            debug(1, `npm install attempt ${attempt}/${installMaxAttempts} failed; retrying (${details})`);
            await sleep(installRetryDelayMs * attempt);
          }
        }
      }

      const attempts = failures
        .map(({ details }, index) => `  - ${index + 1}/${installMaxAttempts}: ${details}`)
        .join('\n');
      const cause = failures[failures.length - 1]?.error;
      throw new Error(
        `Failed to install ${packageName}@${version} globally into '${installContext.globalModulesPath}' after ${installMaxAttempts} attempts.\n` +
        `Attempts:\n${attempts}`,
        { cause }
      );
    };

    const resolveInstalledPackagePath = async ({ packageName, version, alias, repair }) => {
      const globalModulesPath = await getNpmGlobalRoot(baseNpmEnv);
      const packagePath = path.join(globalModulesPath, alias);
      const latestVersion = version === 'latest'
        ? await getLatestVersion(packageName, baseNpmEnv, packagePath)
        : null;
      if (!repair && await isPackageInstalled(
        packagePath,
        version,
        latestVersion,
        getInstallMarkerPath(globalModulesPath, alias)
      )) {
        debug(1, `reusing installed alias ${alias} from ${globalModulesPath}`);
        return packagePath;
      }

      const installContext = await getWritableInstallContext(globalModulesPath, baseNpmEnv);
      const installPath = path.join(installContext.globalModulesPath, alias);
      const markerPath = getInstallMarkerPath(installContext.globalModulesPath, alias);
      if (!repair
        && installContext.globalModulesPath !== globalModulesPath
        && await isPackageInstalled(installPath, version, latestVersion, markerPath)) {
        debug(1, `reusing cached npm alias ${alias} from ${installContext.globalModulesPath}`);
        return installPath;
      }

      return withInstallLock(getInstallLockPath(installContext.globalModulesPath, alias), async (exclusive) => {
        // Re-check while holding the lock: a peer we queued behind may have
        // installed the alias already, and an unmarked alias can only be
        // adopted here, where nothing else is writing to it.
        if (!repair && await isPackageInstalled(installPath, version, latestVersion, markerPath, { adopt: true })) {
          debug(1, `adopted existing npm alias ${alias} from ${installContext.globalModulesPath}`);
          return installPath;
        }
        await removeInstallMarker(markerPath);
        if (repair && await directoryExists(installPath)) {
          await removePackageAlias(installPath, 'corrupt');
        }
        // Install the exact version returned by metadata lookup. Otherwise the
        // `latest` tag could move between lookup and install, leaving the cache
        // marker immediately stale and triggering a reinstall on every call.
        const versionToInstall = version === 'latest' ? latestVersion : version;
        await installPackage({ alias, packageName, version: versionToInstall, packagePath: installPath, installContext, exclusive });
        await writeInstallMarker(markerPath, {
          alias,
          version: await getInstalledPackageVersion(installPath),
          requestedVersion: version
        });
        return installPath;
      });
    };

    // Collapse the concurrent callers of one alias inside this process: identical
    // requests share a single install, and an install and a repair of the same
    // alias are serialized instead of overlapping. Without this every `use()` in
    // a cold top-level-await wave starts its own `npm install -g` (issue #70).
    const ensurePackageInstalled = async ({ packageName, version }, { repair = false } = {}) => {
      const alias = `${packageName.replace('@', '').replace('/', '-')}-v-${version}`;
      const aliasKey = `${getNpmEnvId(npmEnvSource)}\0${alias}`;
      const requestKey = repair ? `${aliasKey}\0repair` : aliasKey;
      return dedupeNpmInstall(
        requestKey,
        aliasKey,
        () => resolveInstalledPackagePath({ packageName, version, alias, repair })
      );
    };

    const { packageName, version, modulePath } = parseModuleSpecifier(moduleSpecifier);
    const resolvePackageModule = async (packagePath) => {
      const packageJsonPath = path.join(packagePath, 'package.json');
      if (await fileExists(packageJsonPath)) {
        const parsed = JSON.parse(await readFile(packageJsonPath, 'utf8'));
        if (Object.prototype.hasOwnProperty.call(parsed, 'exports')) {
          const packageSubpath = modulePath ? `.${modulePath}` : '.';
          const target = resolvePackageExportTarget(parsed.exports, packageSubpath);
          if (target === unresolvedPackageExport || target === null) {
            throw new Error(`Package subpath '${packageSubpath}' is not exported by '${packageJsonPath}'.`);
          }
          if (typeof target !== 'string' || !target.startsWith('./')) {
            throw new Error(`Invalid package exports target '${target}' for '${packageSubpath}' in '${packageJsonPath}'.`);
          }
          const packageExportPath = path.resolve(packagePath, target);
          const relativeExportPath = path.relative(packagePath, packageExportPath);
          if (path.isAbsolute(relativeExportPath)
            || relativeExportPath === '..'
            || relativeExportPath.startsWith(`..${path.sep}`)) {
            throw new Error(`Package exports target '${target}' for '${packageSubpath}' escapes '${packagePath}'.`);
          }
          const resolvedExportPath = await tryResolveModule(packageExportPath);
          if (!resolvedExportPath) {
            throw new Error(`Failed to resolve package export '${packageSubpath}' from '${packageExportPath}'.`);
          }
          return resolvedExportPath;
        }
      }

      const packageModulePath = modulePath ? path.join(packagePath, modulePath) : packagePath;
      const resolvedPath = await tryResolveModule(packageModulePath);
      if (!resolvedPath) {
        throw new Error(`Failed to resolve the path to '${moduleSpecifier}' from '${packageModulePath}'.`);
      }
      return resolvedPath;
    };

    let packagePath = await ensurePackageInstalled(
      { packageName, version },
      { repair: Boolean(options?.repair) }
    );
    try {
      return await resolvePackageModule(packagePath);
    } catch (error) {
      if (options?.repair || modulePath) {
        throw error;
      }
      packagePath = await ensurePackageInstalled({ packageName, version }, { repair: true });
      return resolvePackageModule(packagePath);
    }
  },
  bun: async (moduleSpecifier, pathResolver) => {
    const path = await import('node:path');
    const { exec } = await import('node:child_process');
    const { promisify } = await import('node:util');
    const { stat, readFile } = await import('node:fs/promises');
    const execAsync = promisify(exec);

    if (!pathResolver) {
      throw new Error('Failed to get the current resolver.');
    }

    const fileExists = async (filePath) => {
      try {
        const stats = await stat(filePath);
        return stats.isFile();
      } catch (error) {
        if (error.code !== 'ENOENT') {
          throw error;
        }
        return false;
      }
    };

    const directoryExists = async (directoryPath) => {
      try {
        const stats = await stat(directoryPath);
        return stats.isDirectory();
      } catch (error) {
        if (error.code !== 'ENOENT') {
          throw error;
        }
        return false;
      }
    };

    const tryResolveModule = async (packagePath) => {
      try {
        return await pathResolver(packagePath);
      } catch (error) {
        if (error.code !== 'MODULE_NOT_FOUND') {
          throw new Error(`Failed to resolve module '${packagePath}'`, { cause: error });
        }

        if (await directoryExists(packagePath)) {
          const directoryName = path.basename(packagePath);
          const resolvedPath = await tryResolveModule(path.join(packagePath, directoryName));
          if (resolvedPath) {
            return resolvedPath;
          }

          const packageJsonPath = path.join(packagePath, 'package.json');
          if (await fileExists(packageJsonPath)) {
            const packageJson = await readFile(packageJsonPath, 'utf8');
            const parsed = JSON.parse(packageJson);
            if (Object.prototype.hasOwnProperty.call(parsed, 'exports')) {
              const target = resolvePackageExportTarget(parsed.exports, '.');
              if (typeof target === 'string' && target.startsWith('./')) {
                const updatedPath = path.resolve(packagePath, target);
                return await tryResolveModule(updatedPath);
              }
            }
          }

          return null;
        }

        return null;
      }
    };

    const ensurePackageInstalled = async ({ packageName, version }) => {
      const alias = `${packageName.replace('@', '').replace('/', '-')}-v-${version}`;

      let binDir = '';
      try {
        const { stdout } = await execAsync('bun pm bin -g');
        binDir = stdout.trim();
      } catch (error) {
        // In CI or fresh environments, the global directory might not exist
        // Try to get the default Bun install path
        try {
          const os = await import('node:os');
          const home = os.homedir();
          binDir = path.join(home, '.bun', 'bin');
        } catch (osError) {
          throw new Error('Unable to determine Bun global directory.', { cause: error });
        }
      }

      const bunInstallRoot = path.resolve(binDir, '..');
      const globalModulesPath = path.join(bunInstallRoot, 'install', 'global', 'node_modules');
      const packagePath = path.join(globalModulesPath, alias);

      if (version !== 'latest' && await directoryExists(packagePath)) {
        return packagePath;
      }

      try {
        await execAsync(`bun add -g ${alias}@npm:${packageName}@${version} --silent`, { stdio: 'ignore' });
      } catch (error) {
        throw new Error(`Failed to install ${packageName}@${version} globally with Bun.`, { cause: error });
      }

      return packagePath;
    };

    const { packageName, version, modulePath } = parseModuleSpecifier(moduleSpecifier);
    const packagePath = await ensurePackageInstalled({ packageName, version });
    const packageJsonPath = path.join(packagePath, 'package.json');
    if (await fileExists(packageJsonPath)) {
      const parsed = JSON.parse(await readFile(packageJsonPath, 'utf8'));
      if (Object.prototype.hasOwnProperty.call(parsed, 'exports')) {
        const packageSubpath = modulePath ? `.${modulePath}` : '.';
        const target = resolvePackageExportTarget(parsed.exports, packageSubpath);
        if (target === unresolvedPackageExport || target === null) {
          throw new Error(`Package subpath '${packageSubpath}' is not exported by '${packageJsonPath}'.`);
        }
        if (typeof target !== 'string' || !target.startsWith('./')) {
          throw new Error(`Invalid package exports target '${target}' for '${packageSubpath}' in '${packageJsonPath}'.`);
        }
        const packageExportPath = path.resolve(packagePath, target);
        const relativeExportPath = path.relative(packagePath, packageExportPath);
        if (path.isAbsolute(relativeExportPath)
          || relativeExportPath === '..'
          || relativeExportPath.startsWith(`..${path.sep}`)) {
          throw new Error(`Package exports target '${target}' for '${packageSubpath}' escapes '${packagePath}'.`);
        }
        const resolvedExportPath = await tryResolveModule(packageExportPath);
        if (!resolvedExportPath) {
          throw new Error(`Failed to resolve package export '${packageSubpath}' from '${packageExportPath}'.`);
        }
        return resolvedExportPath;
      }
    }

    const packageModulePath = modulePath ? path.join(packagePath, modulePath) : packagePath;
    const resolvedPath = await tryResolveModule(packageModulePath);
    if (!resolvedPath) {
      throw new Error(`Failed to resolve the path to '${moduleSpecifier}' from '${packageModulePath}'.`);
    }
    return resolvedPath;
  },
  deno: async (moduleSpecifier, pathResolver) => {
    const { packageName, version, modulePath } = parseModuleSpecifier(moduleSpecifier);

    // Use esm.sh as the default CDN for Deno, which provides good Deno compatibility
    const resolvedPath = `https://esm.sh/${packageName}@${version}${modulePath}`;
    return resolvedPath;
  },
  skypack: async (moduleSpecifier, pathResolver) => {
    const resolvedPath = `https://cdn.skypack.dev/${moduleSpecifier}`;
    return resolvedPath;
  },
  jsdelivr: async (moduleSpecifier, pathResolver) => {
    const { packageName, version, modulePath } = parseModuleSpecifier(moduleSpecifier);
    // If no modulePath is provided, append /{packageName}.js
    let path = modulePath ? modulePath : `/${packageName}`;
    if (/\.(mc)?js$/.test(path) === false) {
      path += '.js';
    }
    const resolvedPath = `https://cdn.jsdelivr.net/npm/${packageName}-es@${version}${path}`;
    return resolvedPath;
  },
  unpkg: async (moduleSpecifier, pathResolver) => {
    const { packageName, version, modulePath } = parseModuleSpecifier(moduleSpecifier);
    // If no modulePath is provided, append /{packageName}.js
    let path = modulePath ? modulePath : `/${packageName}`;
    if (/\.(mc)?js$/.test(path) === false) {
      path += '.js';
    }
    const resolvedPath = `https://unpkg.com/${packageName}-es@${version}${path}`;
    return resolvedPath;
  },
  esm: async (moduleSpecifier, pathResolver) => {
    const resolvedPath = `https://esm.sh/${moduleSpecifier}`;
    return resolvedPath;
  },
  jspm: async (moduleSpecifier, pathResolver) => {
    let { packageName, version, modulePath } = parseModuleSpecifier(moduleSpecifier);
    if (version === 'latest') {
      version = '';
    }
    const resolvedPath = `https://jspm.dev/${packageName}${version ? `@${version}` : ''}${modulePath}`;
    return resolvedPath;
  },
}
