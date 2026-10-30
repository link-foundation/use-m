const { chmod, mkdir, mkdtemp, readFile, realpath, rm, writeFile } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const path = require('node:path');

exports.createEngineFixture = async (metadata) => {
  const root = await realpath(await mkdtemp(path.join(tmpdir(), 'use-m-engines-')));
  const bin = path.join(root, 'bin');
  const modules = path.join(root, 'modules');
  const log = path.join(root, 'npm.log');
  await mkdir(bin, { recursive: true });
  await mkdir(modules, { recursive: true });
  await writeFile(log, '');
  const npm = path.join(bin, 'npm');
  await writeFile(npm, `#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const args = process.argv.slice(2);
fs.appendFileSync(process.env.USE_M_ENGINE_LOG, JSON.stringify(args) + '\\n');
if (args[0] === 'root') console.log(process.env.USE_M_ENGINE_MODULES);
else if (args[0] === 'view') console.log(process.env.USE_M_ENGINE_METADATA);
else if (args[0] === 'show') console.log('2.0.0');
else if (args[0] === 'install') {
  const spec = args.find(arg => arg.includes('@npm:'));
  const alias = spec.split('@npm:')[0];
  const version = spec.slice(spec.lastIndexOf('@') + 1);
  const dir = path.join(process.env.USE_M_ENGINE_MODULES, alias);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({version, type:'commonjs', main:'index.js'}));
  fs.writeFileSync(path.join(dir, 'index.js'), 'module.exports = ' + JSON.stringify({version}) + ';');
} else process.exit(1);
`);
  await chmod(npm, 0o755);
  await writeFile(`${npm}.cmd`, '@echo off\r\nnode "%~dp0npm" %*\r\n');
  const env = { ...process.env,
    PATH: `${bin}${path.delimiter}${process.env.PATH || ''}`,
    USE_M_ENGINE_MODULES: modules, USE_M_ENGINE_LOG: log,
    USE_M_ENGINE_METADATA: JSON.stringify(Object.values(metadata.versions)),
  };
  delete env.USE_M_ENGINE_STRICT;
  const messages = [];
  const options = { env, registry: `https://engines.example.test/${path.basename(root)}/`,
    latestVersionCacheDirectory: path.join(root, 'cache'),
    registryMaxAttempts: 1, registryCliFallback: false, installRetryDelayMs: 0,
    debug: true, debugLogger: message => messages.push(message),
    fetch: async () => ({ ok: true, json: async () => metadata }),
  };
  return { root, modules, options, messages, cleanup: () => rm(root, { recursive: true, force: true }),
    calls: async () => (await readFile(log, 'utf8')).trim().split('\n').filter(Boolean).map(JSON.parse),
  };
};

exports.enginePackument = () => ({
  'dist-tags': { latest: '2.0.0', next: '3.0.0-beta.1' },
  versions: {
    '1.2.0': { version: '1.2.0', engines: { node: '>=18' } },
    '1.10.0': { version: '1.10.0', engines: { node: '>=18' } },
    '2.0.0': { version: '2.0.0', engines: { node: '>=999' } },
    '3.0.0-beta.1': { version: '3.0.0-beta.1', engines: { node: '>=18' } },
  },
});
