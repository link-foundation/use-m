import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const code = fs.readFileSync(path.join(__dirname, 'use.mjs'), 'utf8');
const use = eval(code);
export { use };