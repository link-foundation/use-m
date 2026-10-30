// Deterministic incident reproduction: no registry access or real global install.
// Run: node experiments/issue-79/reproduce.mjs
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { resolvers } from '../../use.mjs';
import fixtures from '../../tests/fixtures/npm-engines.cjs';

const metadata = { versions: {
  '1.6.2': { version: '1.6.2', engines: { node: '>=20.0.0' } },
  '2.0.0': { version: '2.0.0', engines: { node: '>=22.0.0' } },
} };
const fixture = await fixtures.createEngineFixture(metadata);
const descriptor = Object.getOwnPropertyDescriptor(process.versions, 'node');
try {
  Object.defineProperty(process.versions, 'node', { configurable: true, value: '20.20.2' });
  await resolvers.npm('command-stream', createRequire(import.meta.url).resolve, {
    ...fixture.options, debug: 2, debugLogger: console.error,
  });
  const installs = (await fixture.calls()).filter(args => args[0] === 'install');
  assert.equal(installs.length, 1);
  assert.ok(installs[0].includes('command-stream-v-1.6.2@npm:command-stream@1.6.2'));
  console.log('PASS: Node 20.20.2 selected command-stream@1.6.2 instead of incompatible 2.0.0.');
} finally {
  Object.defineProperty(process.versions, 'node', descriptor);
  await fixture.cleanup();
}
