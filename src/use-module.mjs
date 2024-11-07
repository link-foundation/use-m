import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import resolvers from './resolvers.mjs';
const __filename = fileURLToPath(import.meta.url);
const require = createRequire(__filename);
const __dirname = path.dirname(__filename);
const code = fs.readFileSync(path.join(__dirname, 'use.mjs'), 'utf8');
const baseUse = eval(code);
const use = async (moduleSpecifier) => {
  const { npm } = resolvers;
  return baseUse(await npm(moduleSpecifier, require.resolve));
}
export { use };