#!/usr/bin/env node

/**
 * Trace the local npm resolver while resolving the issue #47 reproduction.
 *
 * This intentionally uses the current machine's npm global root rather than a
 * hard-coded installation path, so it can be rerun from any checkout.
 */

import { createRequire } from 'node:module';
import { resolvers } from '../src/use.mjs';

const require = createRequire(import.meta.url);
const attempts = [];
const tracingResolver = candidate => {
  attempts.push(candidate);
  return require.resolve(candidate);
};

try {
  const resolved = await resolvers.npm('yargs/helpers', tracingResolver, {
    debug: 'verbose',
    debugLogger: message => console.error(message),
  });

  console.log('Resolver candidates:');
  for (const candidate of attempts) {
    console.log(`  - ${candidate}`);
  }
  console.log(`Resolved yargs/helpers to: ${resolved}`);
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
