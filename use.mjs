// AUTO-GENERATED — do not edit. This is a root-level mirror of src/use.mjs,
// published so the historical CDN URL https://unpkg.com/use-m/use.mjs keeps
// resolving (unpkg/jsdelivr ignore package.json "exports"). The canonical
// source is src/use.mjs; edit it and run `npm run sync:entries`. See
// https://github.com/link-foundation/use-m/issues/60.
const extractCallerContext = (stack) => {
  // Helper to check if a path is a use-m file
  const isUseMFile = (path) => {
    return path.endsWith('/use.mjs') ||
           path.endsWith('/use.cjs') ||
           path.endsWith('/use.js');
  };

  // In browser environment, use the current document URL as fallback
  if (typeof window !== 'undefined' && window.location) {
    // For inline scripts in HTML, use the document's URL
    // This will be the fallback if we can't extract from stack
    const documentUrl = window.location.href;

    // Try to extract from stack first, but we'll fallback to document URL
    if (!stack) return documentUrl;
  } else if (!stack) {
    return null;
  }

  const lines = stack.split('\n');
  // Look for the first file that isn't use.mjs/use.cjs/use.js - skip the first few frames
  // to get past our internal function calls
  for (const line of lines) {
    // Skip the first few frames which are internal to use-m
    if (line.includes('extractCallerContext') ||
      line.includes('_use') ||
      line.includes('makeUse') ||
      (line.includes('<anonymous>') && (line.includes('/use.mjs') || line.includes('/use.cjs') || line.includes('/use.js')))) {
      continue;
    }

    // Try to match http(s):// URLs for browser environments
    let match = line.match(/https?:\/\/[^\s)]+/);
    if (match && !isUseMFile(match[0])) {
      // Remove line:column numbers if present
      const url = match[0].replace(/:\d+:\d+$/, '');
      return url;
    }

    // Try to match file:// URLs
    match = line.match(/file:\/\/[^\s)]+/);
    if (match && !isUseMFile(match[0])) {
      // Remove line:column numbers if present
      const url = match[0].replace(/:\d+:\d+$/, '');
      return url;
    }

    // Special handling for Jest environment
    // Jest paths often look like: at Object.<anonymous> (/path/to/test.mjs:7:24)
    // Or: at /path/to/test.mjs:7:24
    if (line.includes('.test.') || line.includes('.spec.')) {
      // Try to extract the actual test file path from Jest stack traces
      match = line.match(/\(([^)]+\.(?:test|spec)\.[^)]+):\d+:\d+\)/);
      if (!match) {
        match = line.match(/([^(\s]+\.(?:test|spec)\.[^(\s:]+):\d+:\d+/);
      }
      if (match && match[1]) {
        const testPath = match[1];
        // Convert to file:// URL format if it's an absolute path
        if (testPath.startsWith('/')) {
          return `file://${testPath}`;
        }
      }
    }

    // For Node/Deno, try to match absolute paths (improved to handle more cases)
    match = line.match(/at\s+(?:Object\.<anonymous>\s+)?(?:async\s+)?[(]?(\/[^\s:)]+\.(?:m?js|json))(?::\d+:\d+)?\)?/);
    if (match && !isUseMFile(match[1]) && !match[1].includes('node_modules')) {
      return 'file://' + match[1];
    }

    // Alternative pattern for Jest and other environments
    match = line.match(/at\s+[^(]*\(([^)]+\.(?:m?js|json)):\d+:\d+\)/);
    if (match && !isUseMFile(match[1]) && !match[1].includes('node_modules')) {
      return 'file://' + (match[1].startsWith('/') ? match[1] : '/' + match[1]);
    }
  }
  return null;
};

export const parseModuleSpecifier = (moduleSpecifier) => {
  if (!moduleSpecifier || typeof moduleSpecifier !== 'string' || moduleSpecifier.length <= 0) {
    throw new Error(
      `Name for a package to be imported is not provided.
Please specify package name and an optional version (e.g., 'lodash', 'lodash@4.17.21' or '@chakra-ui/react@1.0.0').`
    );
  }
  const regex = /^(?<packageName>(@[^@/]+\/)?[^@/]+)?(?:@(?<version>[^/]*))?(?<modulePath>(?:\/[^@]+)*)?$/;
  const match = moduleSpecifier.match(regex);
  if (!match || typeof match.groups.packageName !== 'string' || match.groups.packageName.trim() === '') {
    throw new Error(
      `Failed to parse package identifier '${moduleSpecifier}'.
Please specify a package name, and an optional version (e.g.: 'lodash', 'lodash@4.17.21' or '@chakra-ui/react@1.0.0').`
    );
  }
  let { packageName, version, modulePath } = match.groups;
  if (typeof version !== 'string' || version.trim() === '') {
    version = 'latest';
  }
  if (typeof modulePath !== 'string' || modulePath.trim() === '') {
    modulePath = '';
  }
  return { packageName, version, modulePath };
}

// Built-in modules that we support across all environments
// Always use lowercase names for consistency
const supportedBuiltins = {
  // Universal modules
  'console': {
    browser: () => ({ default: console, log: console.log, error: console.error, warn: console.warn, info: console.info }),
    node: () => import('node:console').then(m => ({ default: m.Console, ...m }))
  },
  'crypto': {
    browser: () => ({ default: crypto, subtle: crypto.subtle }),
    node: () => import('node:crypto').then(m => ({ default: m, ...m }))
  },
  'url': {
    browser: () => ({ default: URL, URL, URLSearchParams }),
    node: () => import('node:url').then(m => ({ default: m, ...m }))
  },
  'performance': {
    browser: () => ({ default: performance, now: performance.now.bind(performance) }),
    node: () => import('node:perf_hooks').then(m => ({ default: m.performance, performance: m.performance, now: m.performance.now.bind(m.performance), ...m }))
  },

  // Node.js/Bun only modules
  'fs': {
    browser: null, // Not available in browser
    node: () => import('node:fs').then(m => ({ default: m, ...m }))
  },
  'fs/promises': {
    browser: null, // Not available in browser
    node: async () => {
      const runtime = typeof Bun !== 'undefined' ? 'Bun' : typeof Deno !== 'undefined' ? 'Deno' : 'Node.js';
      
      // For Bun and Deno, use a different approach since their node:fs/promises may not be fully compatible
      if (runtime === 'Bun' || runtime === 'Deno') {
        try {
          const fs = await import('node:fs');
          const { promisify } = await import('node:util');
          
          // Create wrapper functions that match native fs/promises signatures
          // These need to have the correct .length property and be async functions
          const createAsyncWrapper = (promisifiedFn, expectedLength) => {
            // Create an async function with the correct length
            const wrapper = {
              1: async (a) => promisifiedFn(a),
              2: async (a, b) => promisifiedFn(a, b),
              3: async (a, b, c) => promisifiedFn(a, b, c),
              4: async (a, b, c, d) => promisifiedFn(a, b, c, d)
            }[expectedLength];
            
            // Copy the name if possible
            try {
              Object.defineProperty(wrapper, 'name', { value: promisifiedFn.name });
            } catch (e) {
              // Ignore if name can't be set
            }
            
            return wrapper || promisifiedFn;
          };
          
          // Helper to safely promisify functions that may not exist
          const safePromisify = (fn, expectedLength) => {
            if (typeof fn !== 'function') {
              return undefined;
            }
            return createAsyncWrapper(promisify(fn), expectedLength);
          };
          
          const promisifiedFs = {
            access: safePromisify(fs.access, 2),
            appendFile: safePromisify(fs.appendFile, 3),
            chmod: safePromisify(fs.chmod, 2),
            chown: safePromisify(fs.chown, 3),
            copyFile: safePromisify(fs.copyFile, 3),
            lchmod: safePromisify(fs.lchmod, 2),
            lchown: safePromisify(fs.lchown, 3),
            link: safePromisify(fs.link, 2),
            lstat: safePromisify(fs.lstat, 2),
            mkdir: safePromisify(fs.mkdir, 2),
            mkdtemp: safePromisify(fs.mkdtemp, 2),
            open: safePromisify(fs.open, 3),
            readdir: safePromisify(fs.readdir, 2),
            readFile: safePromisify(fs.readFile, 2),
            readlink: safePromisify(fs.readlink, 2),
            realpath: safePromisify(fs.realpath, 2),
            rename: safePromisify(fs.rename, 2),
            rmdir: safePromisify(fs.rmdir, 2),
            stat: safePromisify(fs.stat, 2),
            symlink: safePromisify(fs.symlink, 3),
            truncate: safePromisify(fs.truncate, 2),
            unlink: safePromisify(fs.unlink, 1),
            utimes: safePromisify(fs.utimes, 3),
            writeFile: safePromisify(fs.writeFile, 3),
            constants: fs.constants
          };
          
          // Add newer functions if they exist
          if (fs.rm) promisifiedFs.rm = safePromisify(fs.rm, 2);
          if (fs.cp) promisifiedFs.cp = safePromisify(fs.cp, 3);
          if (fs.lutimes) promisifiedFs.lutimes = safePromisify(fs.lutimes, 3);
          if (fs.opendir) promisifiedFs.opendir = safePromisify(fs.opendir, 2);
          if (fs.statfs) promisifiedFs.statfs = safePromisify(fs.statfs, 2);
          if (fs.watch) promisifiedFs.watch = fs.watch.bind(fs); // watch is not callback-based

          return { default: promisifiedFs, ...promisifiedFs };
        } catch (error) {
          throw new Error(`Failed to create fs/promises fallback for ${runtime}: ${error.message}`, { cause: error });
        }
      }
      
      // For Node.js, use the native implementation
      try {
        const m = await import('node:fs/promises');
        return { default: m, ...m };
      } catch (error) {
        throw new Error(`Failed to load fs/promises module: ${error.message}`, { cause: error });
      }
    }
  },
  'dns/promises': {
    browser: null, // Not available in browser
    node: async () => {
      const m = await import('node:dns/promises');
      return { default: m, ...m };
    }
  },
  'stream/promises': {
    browser: null, // Not available in browser
    node: async () => {
      const m = await import('node:stream/promises');
      return { default: m, ...m };
    }
  },
  'readline/promises': {
    browser: null, // Not available in browser
    node: async () => {
      const m = await import('node:readline/promises');
      return { default: m, ...m };
    }
  },
  'timers/promises': {
    browser: null, // Not available in browser
    node: async () => {
      const m = await import('node:timers/promises');
      return { default: m, ...m };
    }
  },
  'path': {
    browser: null, // Not available in browser
    node: () => import('node:path').then(m => ({ default: m, ...m }))
  },
  'os': {
    browser: null, // Not available in browser
    node: () => import('node:os').then(m => ({ default: m, ...m }))
  },
  'util': {
    browser: null, // Not available in browser
    node: () => import('node:util').then(m => ({ default: m, ...m }))
  },
  'events': {
    browser: null, // Not available in browser
    node: () => import('node:events').then(m => ({ default: m.EventEmitter, EventEmitter: m.EventEmitter, ...m }))
  },
  'stream': {
    browser: null, // Not available in browser
    node: () => import('node:stream').then(m => ({ default: m.Stream, Stream: m.Stream, ...m }))
  },
  'buffer': {
    browser: null, // Not available in browser (would need polyfill)
    node: () => import('node:buffer').then(m => ({ default: m, Buffer: m.Buffer, ...m }))
  },
  'process': {
    browser: null, // Not available in browser
    node: () => {
      if (typeof Deno !== 'undefined') {
        // Deno 2.x has a process global, use it if available
        if (typeof process !== 'undefined') {
          // In Deno, process is an EventEmitter and spreading doesn't work properly
          // We need to explicitly copy the properties we need
          const proc = {
            default: process,
            pid: process.pid,
            platform: process.platform,
            version: process.version,
            versions: process.versions,
            argv: process.argv,
            env: process.env,
            exit: process.exit,
            cwd: process.cwd,
            chdir: process.chdir,
            // Add any other commonly used process properties
            nextTick: process.nextTick,
            stdout: process.stdout,
            stderr: process.stderr,
            stdin: process.stdin,
          };
          return proc;
        }
        // This shouldn't happen but provide a fallback
        throw new Error(`Failed to resolve 'process' module in Deno environment.`);
      }
      return ({ default: process, ...process });
    }
  },
  'child_process': {
    browser: null,
    node: () => import('node:child_process').then(m => ({ default: m, ...m }))
  },
  'http': {
    browser: null,
    node: () => import('node:http').then(m => ({ default: m, ...m }))
  },
  'https': {
    browser: null,
    node: () => import('node:https').then(m => ({ default: m, ...m }))
  },
  'net': {
    browser: null,
    node: () => import('node:net').then(m => ({ default: m, ...m }))
  },
  'dns': {
    browser: null,
    node: () => import('node:dns').then(m => ({ default: m, ...m }))
  },
  'zlib': {
    browser: null,
    node: () => import('node:zlib').then(m => ({ default: m, ...m }))
  },
  'querystring': {
    browser: null,
    node: () => import('node:querystring').then(m => ({ default: m, ...m }))
  },
  'assert': {
    browser: null,
    node: () => import('node:assert').then(m => ({ default: m.default || m, ...m }))
  }
};

export const resolvers = {
  builtin: async (moduleSpecifier, pathResolver) => {
    const { packageName, modulePath } = parseModuleSpecifier(moduleSpecifier);

    // Handle built-in modules with subpaths like 'node:fs/promises'
    let moduleName;
    if (packageName.startsWith('node:')) {
      // For node: modules, include the path in the module name
      moduleName = packageName.slice(5) + modulePath;
    } else {
      moduleName = packageName + modulePath;
    }

    // Check if we support this built-in module
    if (supportedBuiltins[moduleName]) {
      const builtinConfig = supportedBuiltins[moduleName];

      if (!builtinConfig) {
        throw new Error(`Built-in module '${moduleName}' is not supported.`);
      }

      // Determine environment
      const isBrowser = typeof window !== 'undefined';
      const environment = isBrowser ? 'browser' : 'node';

      const moduleFactory = builtinConfig[environment];
      if (!moduleFactory) {
        throw new Error(`Built-in module '${moduleName}' is not available in ${environment} environment.`);
      }

      try {
        // Execute the factory function to get the module
        const result = await moduleFactory();
        return result;
      } catch (error) {
        throw new Error(`Failed to load built-in module '${moduleName}' in ${environment} environment.`, { cause: error });
      }
    }

    // Not a supported built-in module
    return null;
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
        // Try URL-based resolution for both file:// and http(s):// URLs
        const url = new URL(moduleSpecifier, callerUrl);
        // For Bun, return pathname instead of full URL
        if (typeof Bun !== 'undefined' && callerUrl.startsWith('file://')) {
          resolvedPath = url.pathname;
        } else {
          resolvedPath = url.href;
        }
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
    // Timings of the cross-process install lock (see `acquireInstallLock`).
    const durationOption = (value, fallback) =>
      typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : fallback;
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

    const sleep = (milliseconds) => new Promise(resolve => setTimeout(resolve, milliseconds));

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
            const exp = parsed.exports;
            if (exp) {
              let target = null;
              if (typeof exp === 'string') {
                target = exp;
              } else {
                const root = exp['.'] ?? exp;
                if (typeof root === 'string') {
                  target = root;
                } else if (root && typeof root === 'object') {
                  target = root.import || root.default || root.require || root.module || root.browser || null;
                }
              }
              if (typeof target === 'string') {
                const updatedPath = path.join(packagePath, target);
                return await tryResolveModule(updatedPath);
              }
            }
          }

          return null;
        }

        return null;
      }
    };

    const getLatestVersion = async (packageName, env) => {
      const { stdout: version } = await execAsync(`npm show ${packageName} version`, { env });
      return version.trim();
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
      const { stdout: globalModulesPath } = await execAsync('npm root -g', { env });
      const trimmedPath = globalModulesPath.trim();
      if (!trimmedPath) {
        throw new Error('npm root -g returned an empty global root.');
      }
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
          await execAsync(
            `npm install -g ${alias}@npm:${packageName}@${version}`,
            { env: installContext.env }
          );
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
      const latestVersion = version === 'latest' ? await getLatestVersion(packageName, baseNpmEnv) : null;
      const globalModulesPath = await getNpmGlobalRoot(baseNpmEnv);
      const packagePath = path.join(globalModulesPath, alias);
      if (!repair && await isPackageInstalled(
        packagePath,
        version,
        latestVersion,
        getInstallMarkerPath(globalModulesPath, alias)
      )) {
        return packagePath;
      }

      const installContext = await getWritableInstallContext(globalModulesPath, baseNpmEnv);
      const installPath = path.join(installContext.globalModulesPath, alias);
      const markerPath = getInstallMarkerPath(installContext.globalModulesPath, alias);
      if (!repair
        && installContext.globalModulesPath !== globalModulesPath
        && await isPackageInstalled(installPath, version, latestVersion, markerPath)) {
        return installPath;
      }

      return withInstallLock(getInstallLockPath(installContext.globalModulesPath, alias), async (exclusive) => {
        // Re-check while holding the lock: a peer we queued behind may have
        // installed the alias already, and an unmarked alias can only be
        // adopted here, where nothing else is writing to it.
        if (!repair && await isPackageInstalled(installPath, version, latestVersion, markerPath, { adopt: true })) {
          return installPath;
        }
        await removeInstallMarker(markerPath);
        if (repair && await directoryExists(installPath)) {
          await removePackageAlias(installPath, 'corrupt');
        }
        await installPackage({ alias, packageName, version, packagePath: installPath, installContext, exclusive });
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
      const aliasKey = `${getNpmEnvId(npmEnvSource)} ${alias}`;
      const requestKey = repair ? `${aliasKey} repair` : aliasKey;
      return dedupeNpmInstall(
        requestKey,
        aliasKey,
        () => resolveInstalledPackagePath({ packageName, version, alias, repair })
      );
    };

    const { packageName, version, modulePath } = parseModuleSpecifier(moduleSpecifier);
    const resolvePackageModule = async (packagePath) => {
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
            const exp = parsed.exports;
            if (exp) {
              let target = null;
              if (typeof exp === 'string') {
                target = exp;
              } else {
                const root = exp['.'] ?? exp;
                if (typeof root === 'string') {
                  target = root;
                } else if (root && typeof root === 'object') {
                  target = root.import || root.default || root.require || root.module || root.browser || null;
                }
              }
              if (typeof target === 'string') {
                const updatedPath = path.join(packagePath, target);
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

// Ordered chains of universal-ESM CDN resolvers tried for network/CDN loading.
// Each entry is a key into `resolvers`; the chains list *distinct* CDN hosts so a
// single CDN outage no longer breaks `use()` — when the first host fails we fall
// back to the next. The primary entry preserves the previous default per runtime.
export const networkResolverChain = ['esm', 'jspm', 'skypack']
export const denoResolverChain = ['deno', 'jspm', 'skypack']

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

// Generic, mechanism-agnostic "try sources in order until one works" engine.
// Tries each `source` in order (optionally retrying each `maxAttemptsPerSource`
// times with linear backoff) and returns the first successful `load(source,
// attempt)` result. If every attempt fails it throws ONE clear, aggregated error
// listing every attempt — never just the cryptic last failure (issue #58).
//
// This is the shared core reused by both resilient per-package CDN imports (see
// `makeUse` below) and the use-m bootstrap loader (`loadUseM` in load.mjs /
// load.cjs), so retry/fallback behaves identically everywhere it is used.
//
// @param {Array<unknown>} sources - ordered list of things to try (URLs, resolver keys, ...)
// @param {(source: unknown, attempt: number) => Promise<any>} load - loads one source; throws on failure
// @param {object} [options]
// @param {number} [options.maxAttemptsPerSource] - attempts per source (default 1)
// @param {number} [options.retryDelayMs] - base delay between retries, linear backoff (default 0)
// @param {(source: unknown) => string} [options.describeSource] - human label for a source in errors
// @param {string} [options.label] - what we were trying to do (used in the error message)
// @param {string} [options.hint] - extra guidance appended to the aggregated error
export const loadWithFallback = async (sources, load, options = {}) => {
  const {
    maxAttemptsPerSource = 1,
    retryDelayMs = 0,
    describeSource = (source) => String(source),
    label = 'load from any source',
    hint = '',
  } = options
  if (!Array.isArray(sources) || sources.length === 0) {
    throw new Error(`Failed to ${label}: no sources were provided.`)
  }
  if (typeof load !== 'function') {
    throw new Error(`Failed to ${label}: a load function is required.`)
  }
  const failures = []
  for (const source of sources) {
    for (let attempt = 1; attempt <= maxAttemptsPerSource; attempt++) {
      try {
        return await load(source, attempt)
      } catch (error) {
        const reason = error && error.message ? error.message : String(error)
        failures.push(`${describeSource(source)} (attempt ${attempt}/${maxAttemptsPerSource}): ${reason}`)
        if (attempt < maxAttemptsPerSource && retryDelayMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, retryDelayMs * attempt))
        }
      }
    }
  }
  throw new Error(
    `Failed to ${label}.${hint ? ' ' + hint : ''}\nAttempts:\n  - ` + failures.join('\n  - ')
  )
}

export const baseUse = async (modulePath) => {
  // Dynamically import the module
  try {
    const module = await import(modulePath);

    // More robust default export handling for cross-environment compatibility
    const keys = Object.keys(module);

    // If it's a Module object with a default property, unwrap it
    if (module.default !== undefined) {
      // Check if this is likely a CommonJS module with only default export
      if (keys.length === 1 && keys[0] === 'default') {
        return module.default;
      }

      // Check if default is the main export and other keys are just function/module metadata
      const metadataKeys = new Set([
        'default', '__esModule', 'Symbol(Symbol.toStringTag)',
        'length', 'name', 'prototype', 'constructor',
        'toString', 'valueOf', 'hasOwnProperty', 'isPrototypeOf', 'propertyIsEnumerable'
      ]);

      const nonMetadataKeys = keys.filter(key => !metadataKeys.has(key));

      // If there are no significant non-metadata keys, return the default
      if (nonMetadataKeys.length === 0) {
        return module.default;
      }
    }

    // Return the whole module if it has multiple meaningful exports or no default
    return module;
  } catch (error) {
    throw new Error(`Failed to import module from '${modulePath}'.`, { cause: error });
  }
}

export const makeUse = async (options) => {
  let scriptPath = options?.scriptPath;
  const hasBrowserGlobals = typeof window !== 'undefined' && typeof document !== 'undefined';
  if (!scriptPath && !hasBrowserGlobals && typeof global !== 'undefined' && typeof global['__filename'] !== 'undefined') {
    scriptPath = global['__filename'];
  }
  const metaUrl = options?.meta?.url;
  if (!scriptPath && metaUrl) {
    scriptPath = metaUrl;
  }
  if (!scriptPath) {
    scriptPath = import.meta.url;
  }
  let protocol;
  if (scriptPath) {
    try {
      protocol = new URL(scriptPath).protocol;
    } catch {
      // If scriptPath is a local file path, convert it to file:// URL
      if (scriptPath.startsWith('/') || scriptPath.includes('\\')) {
        protocol = 'file:';
      }
    }
  }
  // Build the ordered chain of specifier resolvers to try. A single-entry chain
  // means "no fallback": an explicit user choice (function or name) and the local
  // npm/bun runtimes import exactly as before. The browser/HTTP and Deno network
  // defaults use a multi-host chain so a CDN outage falls back instead of failing.
  // `import` is an injectable low-level importer (defaults to baseUse) used for
  // dependency injection in tests and advanced setups.
  const importModule = typeof options?.import === 'function' ? options.import : baseUse;
  let resolverChain;
  if (Array.isArray(options?.specifierResolvers) && options.specifierResolvers.length > 0) {
    resolverChain = options.specifierResolvers;
  } else if (typeof options?.specifierResolver === 'function' || options?.specifierResolver) {
    resolverChain = [options.specifierResolver];
  } else {
    const isDenoRuntime = typeof Deno !== 'undefined';
    const isBunRuntime = typeof Bun !== 'undefined';
    const isBrowserRuntime = !isDenoRuntime && !isBunRuntime && hasBrowserGlobals;
    const isNodeRuntime = !isDenoRuntime && !isBunRuntime && !isBrowserRuntime && typeof process !== 'undefined' && Boolean(process.versions?.node);
    if (isBrowserRuntime || (protocol && (protocol === 'http:' || protocol === 'https:'))) {
      resolverChain = networkResolverChain;
    } else if (isDenoRuntime) {
      resolverChain = denoResolverChain;
    } else if (isBunRuntime) {
      resolverChain = ['bun'];
    } else {
      resolverChain = ['npm'];
    }
  }
  let pathResolver = options?.pathResolver;
  if (!pathResolver) {
    const isCJS = typeof module !== "undefined" && !!module.exports;
    const hasRequire = typeof require !== 'undefined';
    const hasScriptPath = scriptPath && (!protocol || protocol === 'file:');
    if (hasRequire && hasScriptPath) {
      if (isCJS) {
        pathResolver = require.resolve;
      } else {
        pathResolver = await import('node:module')
        .then(module => module.createRequire(scriptPath))
        .then(require => require.resolve);
      }
    } else if (hasRequire) {
      pathResolver = require.resolve;
    } else if (hasScriptPath) {
      pathResolver = await import('node:module')
        .then(module => module.createRequire(scriptPath))
        .then(require => require.resolve);
    } else {
      pathResolver = (path) => path;
    }
  }
  return async (moduleSpecifier, providedCallerContext) => {
    const stack = new Error().stack;

    // Use provided caller context or try to capture it from stack trace
    const callerContext = providedCallerContext || extractCallerContext(stack);

    // Always try built-in resolver first
    const builtinModule = await resolvers.builtin(moduleSpecifier, pathResolver);
    if (builtinModule) {
      return builtinModule;
    }

    // Try relative path resolver second (for ./, ../, ../../, etc.)
    const relativeModule = await resolvers.relative(moduleSpecifier, pathResolver, callerContext);
    if (relativeModule) {
      return relativeModule;
    }

    // If not a built-in or relative module, resolve + import via the configured
    // resolver chain. A single-entry chain imports directly (preserving the
    // original behavior and error); a multi-entry chain falls back across CDN
    // mirrors via the shared loadWithFallback engine.
    if (resolverChain.length === 1) {
      const resolver = resolverChain[0];
      const resolverFunction = toResolverFunction(resolver);
      const modulePath = await resolverFunction(moduleSpecifier, pathResolver, options);
      try {
        return await importModule(modulePath);
      } catch (error) {
        if (resolver !== 'npm' || !isRecoverableNpmImportError(error, modulePath)) {
          throw error;
        }
        const repairedModulePath = await resolverFunction(
          moduleSpecifier,
          pathResolver,
          { ...(options || {}), repair: true }
        );
        return importModule(await cacheBustNpmModulePath(repairedModulePath));
      }
    }
    return loadWithFallback(
      resolverChain,
      async (resolver) => {
        const modulePath = await toResolverFunction(resolver)(moduleSpecifier, pathResolver);
        return importModule(modulePath);
      },
      {
        label: `import '${moduleSpecifier}' from any CDN mirror`,
        describeSource: (resolver) => (typeof resolver === 'function' ? 'custom resolver' : String(resolver)),
      }
    );
  };
}

let __usePromise = null;
const _use = async (moduleSpecifier) => {
  const stack = new Error().stack;

  // For Bun, we need to capture the stack trace before any other calls
  let bunCallerContext = null;
  if (typeof Bun !== 'undefined') {
    if (stack) {
      const lines = stack.split('\n');
      // Look for any .mjs file that's not use.mjs
      for (const line of lines) {
        const match = line.match(/[(]?(\/[^\s:)]+\.m?js)/);
        if (match && !match[1].endsWith('/use.mjs')) {
          bunCallerContext = 'file://' + match[1];
          break;
        }
      }
    }
  }

  // Capture the caller context here, before entering makeUse
  const callerContext = bunCallerContext || extractCallerContext(stack);

  if (!__usePromise) {
    __usePromise = makeUse();
  }
  const useInstance = await __usePromise;
  return useInstance(moduleSpecifier, callerContext);
}
_use.all = async (...moduleSpecifiers) => {
  if (!__usePromise) {
    __usePromise = makeUse();
  }
  const useInstance = await __usePromise;
  return Promise.all(moduleSpecifiers.map(useInstance));
}
export const use = _use;
