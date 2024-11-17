// loader.js

// import { resolve, extname } from 'path';
const { pathToFileURL } = require('url');
import { resolvers } from './use.mjs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// The `resolve` hook customizes how module URLs are resolved
export async function resolve(specifier, context, defaultResolve) {
  // const { parentURL } = context;

  // // You can add custom logic here to modify how modules are resolved
  // if (specifier.startsWith('custom:')) {
  //   // Replace "custom:" specifiers with an actual path or URL
  //   const resolvedUrl = new URL(specifier.replace('custom:', ''), parentURL).href;
  //   return { url: resolvedUrl };
  // }
  let defaultResolveError;

  try {
    const resolution = await defaultResolve(specifier, context, defaultResolve);
    if (resolution && resolution.url) {
      return resolution;
    }
  } catch (error) {
    defaultResolveError = error;
  }
  try {
    const { npm } = resolvers;
    const resolvedUrl = await npm(specifier, require.resolve);
    return { url: pathToFileURL(resolvedUrl) };
  } catch (error) {
    if (defaultResolveError) {
      console.error(error);
      throw defaultResolveError;
    } else {
      throw error;
    }
  }
}

// The `load` hook customizes how module code is loaded
export async function load(url, context, defaultLoad) {
  // // Handle specific file extensions (e.g., custom logic for `.custom` files)
  // if (extname(url) === '.custom') {
  //   // Return custom source code for `.custom` files
  //   return {
  //     format: 'module',
  //     source: `export default 'This is a .custom file';`,
  //   };
  // }

  // Fallback to default loading
  return defaultLoad(url, context, defaultLoad);
}

// Optional: Transform the source code of loaded modules
export async function transformSource(source, context, defaultTransformSource) {
  // const { url } = context;

  // // Example: Add a comment to all JavaScript modules
  // if (url.endsWith('.js')) {
  //   return {
  //     source: `// Transformed by loader.js\n${source}`,
  //   };
  // }

  // Fallback to default transformation
  return defaultTransformSource(source, context, defaultTransformSource);
}