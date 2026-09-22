import { use } from '../src/use.mjs';

const typescript = await use('typescript');
const defaultExport = typescript.default;

console.log({
  runtime: globalThis.Bun?.version ?? process.version,
  topLevelKeys: Object.keys(typescript).slice(0, 20),
  version: typescript.version,
  hasScriptTarget: Boolean(typescript.ScriptTarget),
  defaultType: typeof defaultExport,
  defaultKeys:
    defaultExport && (typeof defaultExport === 'object' || typeof defaultExport === 'function')
      ? Object.keys(defaultExport).slice(0, 20)
      : [],
  defaultVersion: defaultExport?.version,
  defaultHasScriptTarget: Boolean(defaultExport?.ScriptTarget),
  nestedDefaultKeys:
    defaultExport?.default &&
    (typeof defaultExport.default === 'object' || typeof defaultExport.default === 'function')
      ? Object.keys(defaultExport.default).slice(0, 20)
      : [],
  nestedDefaultHasScriptTarget: Boolean(defaultExport?.default?.ScriptTarget),
});
