#!/usr/bin/env node
// End-to-end reproduction of issue #78 with the real npm CLI and registry, in a
// throwaway npm prefix. It leaves the state the issue describes — a global
// executable that points into a deleted `semver-v-latest` alias — and then asks
// use-m for a pinned version of the same package.
//
//   node experiments/issue-78/real-npm-dangling-link.mjs [path/to/use.mjs]
//
// Before the fix: "Failed to install semver@7.6.0 globally ... npm error code EEXIST".
// After the fix: the stale link is removed and replaced by one into semver-v-7.6.0.
import { lstat, mkdir, mkdtemp, readlink, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const useModule = path.resolve(process.argv[2] ?? new URL('../../use.mjs', import.meta.url).pathname);
const { resolvers } = await import(pathToFileURL(useModule).href);
const prefix = await mkdtemp(path.join(tmpdir(), 'use-m-issue-78-'));
try {
  const binDirectory = path.join(prefix, 'bin');
  const binPath = path.join(binDirectory, 'semver');
  await mkdir(path.join(prefix, 'lib', 'node_modules'), { recursive: true });
  await mkdir(binDirectory, { recursive: true });
  await symlink('../lib/node_modules/semver-v-latest/bin/semver.js', binPath);
  console.log(`dangling link: ${binPath} -> ${await readlink(binPath)}`);

  const env = { ...process.env, npm_config_prefix: prefix };
  const packagePath = await resolvers.npm('semver@7.6.0', (p) => p, {
    env,
    installRetryDelayMs: 0,
    debug: 1,
  });
  console.log(`resolved: ${packagePath}`);
  console.log(`bin link now: ${binPath} -> ${await readlink(binPath)}`);
  await lstat(path.join(prefix, 'lib', 'node_modules', 'semver-v-7.6.0', 'package.json'));
  console.log('OK: pinned version installed despite the dangling link');
} catch (error) {
  console.error(`FAILED: ${error.message}`);
  process.exitCode = 1;
} finally {
  await rm(prefix, { recursive: true, force: true });
}
