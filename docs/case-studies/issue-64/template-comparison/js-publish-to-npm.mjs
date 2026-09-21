#!/usr/bin/env bun

/**
 * Publish to npm using OIDC trusted publishing
 * Usage: node scripts/publish-to-npm.mjs [--should-pull] [--js-root <path>]
 *   should_pull: Optional flag to pull latest changes before publishing (for release job)
 *
 * Configuration:
 * - CLI: --js-root <path> to explicitly set JavaScript root
 * - Environment: JS_ROOT=<path>
 *
 * Uses link-foundation libraries:
 * - use-m: Dynamic package loading without package.json dependencies
 * - command-stream: Modern shell command execution with streaming support
 * - lino-arguments: Unified configuration from CLI args, env vars, and .lenv files
 *
 * Addresses issues documented in:
 * - Issue #21: Supporting both single and multi-language repository structures
 * - Reference: link-assistant/agent PR #112 (--legacy-peer-deps fix)
 * - Reference: link-assistant/agent PR #114 (configurable package root)
 */

import { appendFileSync } from 'fs';

import { getJsRoot, needsCd, parseJsRootConfig } from './js-paths.mjs';
import { formatNpmPackageVersion, readPackageInfo } from './package-info.mjs';
import {
  buildAuthFailureGuidance,
  isNonRetryableFailure,
} from './publish-failure-classifier.mjs';

// Load use-m dynamically
const { use } = eval(
  await (await fetch('https://unpkg.com/use-m/use.js')).text()
);

// Import link-foundation libraries
const { $ } = await use('command-stream');
const { makeConfig } = await use('lino-arguments');

// Parse CLI arguments using lino-arguments
const config = makeConfig({
  yargs: ({ yargs, getenv }) =>
    yargs
      .option('should-pull', {
        type: 'boolean',
        default: getenv('SHOULD_PULL', false),
        describe: 'Pull latest changes before publishing',
      })
      .option('js-root', {
        type: 'string',
        default: getenv('JS_ROOT', ''),
        describe:
          'JavaScript package root directory (auto-detected if not specified)',
      }),
});

const { shouldPull, jsRoot: jsRootArg } = config;

// Get JavaScript package root (auto-detect or use explicit config)
const jsRootConfig = jsRootArg || parseJsRootConfig();
const jsRoot = getJsRoot({ jsRoot: jsRootConfig, verbose: true });

const MAX_RETRIES = 3;
const RETRY_DELAY = 10000; // 10 seconds

// Store the original working directory to restore after cd commands
// IMPORTANT: command-stream's cd is a virtual command that calls process.chdir()
const originalCwd = process.cwd();

// Patterns that indicate publish failure in changeset output
// Reference: link-assistant/agent PR #116 - prevent false positives in CI/CD
const FAILURE_PATTERNS = [
  'packages failed to publish',
  'error occurred while publishing',
  'npm error code E',
  'npm error 404',
  'npm error 401',
  'npm error 403',
  'Access token expired',
  'ENEEDAUTH',
];

/**
 * Sleep for specified milliseconds
 * @param {number} ms
 */
function sleep(ms) {
  return new Promise((resolve) => globalThis.setTimeout(resolve, ms));
}

/**
 * Check if the output contains any failure patterns
 * Reference: link-assistant/agent PR #116
 * @param {string} output - Combined stdout and stderr
 * @returns {string|null} - The matched failure pattern or null if no failure detected
 */
function detectPublishFailure(output) {
  const lowerOutput = output.toLowerCase();
  for (const pattern of FAILURE_PATTERNS) {
    if (lowerOutput.includes(pattern.toLowerCase())) {
      return pattern;
    }
  }
  return null;
}

/**
 * Verify that a package version is published on npm
 * Reference: link-assistant/agent PR #116
 * @param {Function} shell
 * @param {string} packageName
 * @param {string} version
 * @returns {Promise<boolean>}
 */
async function verifyPublished(shell, packageName, version) {
  const result =
    await shell`npm view "${formatNpmPackageVersion(packageName, version)}" version`.run(
      {
        capture: true,
      }
    );
  return result.code === 0 && result.stdout.trim().includes(version);
}

/**
 * Append to GitHub Actions output file
 * @param {string} key
 * @param {string} value
 */
function setOutput(key, value) {
  const outputFile = process.env.GITHUB_OUTPUT;
  if (outputFile) {
    appendFileSync(outputFile, `${key}=${value}\n`);
  }
}

/**
 * Run changeset:publish command with output capture
 * @param {Function} shell
 * @param {string} jsRoot
 * @param {string} originalCwd
 * @returns {Promise<{result: object|null, error: Error|null}>}
 */
async function runChangesetPublish(shell, jsRoot, originalCwd) {
  try {
    // Run changeset:publish from the js directory where package.json with this script exists
    // IMPORTANT: Use .run({ capture: true }) to capture output for failure detection
    // IMPORTANT: cd is a virtual command that calls process.chdir(), so we restore after
    if (needsCd({ jsRoot })) {
      const result = await shell`cd ${jsRoot} && npm run changeset:publish`.run(
        {
          capture: true,
        }
      );
      process.chdir(originalCwd);
      return { result, error: null };
    }
    const result = await shell`npm run changeset:publish`.run({
      capture: true,
    });
    return { result, error: null };
  } catch (error) {
    // Restore cwd on error before retry
    if (needsCd({ jsRoot })) {
      process.chdir(originalCwd);
    }
    return { result: null, error };
  }
}

/**
 * Analyze publish result for failures using multi-layer detection
 * Reference: link-assistant/agent PR #116
 * @param {object|null} publishResult - The result from runChangesetPublish
 * @param {Error|null} commandError - Error thrown by the command
 * @returns {Error|null} - Error if failure detected, null otherwise
 */
function analyzePublishResult(publishResult, commandError) {
  if (commandError) {
    return commandError;
  }

  const combinedOutput = publishResult
    ? `${publishResult.stdout || ''}\n${publishResult.stderr || ''}`
    : '';

  // Log the output for debugging
  if (combinedOutput.trim()) {
    console.log('Changeset output:', combinedOutput);
  }

  // Check for failure patterns in output (most reliable for changeset)
  const failurePattern = detectPublishFailure(combinedOutput);
  if (failurePattern) {
    console.error(`Detected publish failure: "${failurePattern}"`);
    return new Error(`Publish failed: detected "${failurePattern}" in output`);
  }

  // Check exit code (if available and non-zero)
  if (publishResult && publishResult.code !== 0) {
    console.error(`Changeset exited with code ${publishResult.code}`);
    return new Error(`Publish failed with exit code ${publishResult.code}`);
  }

  return null;
}

/**
 * Perform a single publish attempt with verification
 * @param {string} currentVersion
 * @param {string} packageName
 * @param {Function} shell
 * @param {string} jsRoot
 * @param {string} originalCwd
 * @returns {Promise<{success: boolean, error: Error|null}>}
 */
async function attemptPublish(
  currentVersion,
  packageName,
  shell,
  jsRoot,
  originalCwd
) {
  const { result, error } = await runChangesetPublish(
    shell,
    jsRoot,
    originalCwd
  );
  const analysisError = analyzePublishResult(result, error);

  if (analysisError) {
    // Mark authentication / registry-configuration failures as non-retryable so
    // the retry loop can fail fast with actionable guidance instead of burning
    // through MAX_RETRIES (issue #77).
    const combinedOutput = [
      analysisError.message || '',
      result?.stdout || '',
      result?.stderr || '',
    ].join('\n');
    if (isNonRetryableFailure(combinedOutput)) {
      analysisError.nonRetryable = true;
    }
    return { success: false, error: analysisError };
  }

  // Verify the package is actually on npm (ultimate verification)
  console.log('Verifying package was published to npm...');
  await sleep(2000); // Wait for npm registry to propagate
  const isPublished = await verifyPublished(shell, packageName, currentVersion);

  if (isPublished) {
    return { success: true, error: null };
  }

  console.error('Verification failed: package not found on npm after publish');
  return {
    success: false,
    error: new Error('Package not found on npm after publish attempt'),
  };
}

async function main() {
  try {
    if (shouldPull) {
      // Pull the latest changes we just pushed
      await $`git pull origin main`;
    }

    // Get current version
    const { name: packageName, version: currentVersion } = readPackageInfo({
      jsRoot,
    });
    console.log(`Package to publish: ${packageName}`);
    console.log(`Current version to publish: ${currentVersion}`);

    // Check if this version is already published on npm
    console.log(
      `Checking if version ${currentVersion} is already published...`
    );
    const checkResult =
      await $`npm view "${formatNpmPackageVersion(packageName, currentVersion)}" version`.run(
        {
          capture: true,
        }
      );

    // command-stream returns { code: 0 } on success, { code: 1 } on failure (e.g., E404)
    // Exit code 0 means version exists, non-zero means version not found
    if (checkResult.code === 0) {
      console.log(`Version ${currentVersion} is already published to npm`);
      setOutput('published', 'true');
      setOutput('published_version', currentVersion);
      setOutput('already_published', 'true');
      return;
    }

    // Version not found on npm (E404), proceed with publish
    console.log(
      `Version ${currentVersion} not found on npm, proceeding with publish...`
    );

    // Publish to npm using OIDC trusted publishing with retry logic
    // Multi-layer failure detection based on link-assistant/agent PR #116
    for (let i = 1; i <= MAX_RETRIES; i++) {
      console.log(`Publish attempt ${i} of ${MAX_RETRIES}...`);
      const { success, error } = await attemptPublish(
        currentVersion,
        packageName,
        $,
        jsRoot,
        originalCwd
      );

      if (success) {
        setOutput('published', 'true');
        setOutput('published_version', currentVersion);
        console.log(`\u2705 Published ${packageName}@${currentVersion} to npm`);
        return;
      }

      // Authentication / registry-configuration errors will not be fixed by
      // retrying, so fail fast with actionable guidance instead of burning
      // through MAX_RETRIES (which previously hid the real cause behind a
      // generic "Failed to publish after 3 attempts" message). See issue #77.
      if (error?.nonRetryable) {
        console.error(`Publish failed: ${error.message}`);
        console.error(buildAuthFailureGuidance(packageName));
        process.exit(1);
      }

      if (i < MAX_RETRIES) {
        console.log(
          `Publish failed: ${error.message}, waiting ${RETRY_DELAY / 1000}s before retry...`
        );
        await sleep(RETRY_DELAY);
      }
    }

    console.error(`\u274C Failed to publish after ${MAX_RETRIES} attempts`);
    process.exit(1);
  } catch (error) {
    // Restore cwd on error
    process.chdir(originalCwd);
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
