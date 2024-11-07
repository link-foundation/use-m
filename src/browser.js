// Common use function that imports a module from a given URL
async function use(url) {
  try {
    const module = await import(url);
    return module.default || module;
  } catch (error) {
    console.error(`Failed to import module from ${url}:`, error);
    return null;
  }
}

// CDN-specific resolve functions
function resolveSkypack(specifier) {
  return `https://cdn.skypack.dev/${specifier}`;
}

function resolveJsdelivr(specifier) {
  const match = specifier.match(/^([^@\/]+)@([^\/]+)(\/.+)?$/);
  if (!match) {
    throw new Error(`Invalid module specifier: ${specifier}`);
  }
  let [, packageName, version, subpath = ''] = match;

  // If no subpath is provided, append /{packageName}.js
  const path = subpath ? `${subpath}.js` : `/${packageName}.js`;
  return `https://cdn.jsdelivr.net/npm/${packageName}-es@${version}${path}`;
}

function resolveUnpkg(specifier) {
  const match = specifier.match(/^([^@\/]+)@([^\/]+)(\/.+)?$/);
  if (!match) {
    throw new Error(`Invalid module specifier: ${specifier}`);
  }
  let [, packageName, version, subpath = ''] = match;

  // If no subpath is provided, append /{packageName}.js
  const path = subpath ? `${subpath}.js` : `/${packageName}.js`;
  return `https://unpkg.com/${packageName}-es@${version}${path}`;
}

function resolveEsmSh(specifier) {
  return `https://esm.sh/${specifier}`;
}

function resolveJspm(specifier) {
  const match = specifier.match(/^([^@\/]+)@([^\/]+)(\/.+)?$/);
  if (!match) {
    throw new Error(`Invalid module specifier: ${specifier}`);
  }
  let [, packageName, version, subpath = ''] = match;

  // For jspm, use the package name as is (no '-es')
  const path = subpath;
  return `https://jspm.dev/${packageName}@${version}${path}`;
}

// Example usage
(async () => {
  const cdns = {
    skypack: resolveSkypack,
    jsdelivr: resolveJsdelivr,
    unpkg: resolveUnpkg,
    esm: resolveEsmSh,
    jspm: resolveJspm,
  };

  const specifiers = ['lodash@4.17.21', 'lodash@4.17.21/add'];

  for (const [cdnName, resolve] of Object.entries(cdns)) {
    for (const specifier of specifiers) {
      const url = resolve(specifier);
      const module = await use(url);

      if (module) {
        if (specifier.includes('/add')) {
          // If importing a submodule like 'add'
          if (typeof module === 'function') {
            console.log(`${cdnName}: add(1, 2) =`, module(1, 2));
          } else {
            console.error(`${cdnName}: Imported submodule is not a function.`);
          }
        } else {
          // If importing the main module
          const _ = module;
          if (typeof _.add !== 'function') {
            // Try importing the 'add' submodule
            const addUrl = resolve(`${specifier}/add`);
            const addModule = await use(addUrl);
            if (typeof addModule === 'function') {
              _.add = addModule;
            }
          }
          if (typeof _.add === 'function') {
            console.log(`${cdnName}: _.add(1, 2) =`, _.add(1, 2));
          } else {
            console.error(`${cdnName}: _.add is not a function.`);
          }
        }
      } else {
        console.error(`${cdnName}: Failed to load module from ${url}`);
      }
    }
  }
})();