import { fileURLToPath } from 'url';
import path from 'path';

const { use } = eval(await fetch('https://unpkg.com/use-m/use.js').then(u => u.text()));

// Load environment variables from .env
const { config } = await use('dotenv@16.1.4');
config({ path: path.resolve(process.cwd(), '.env') });

const __filename = fileURLToPath(import.meta.url);

console.log('Current file name:', __filename);

const _ = await use('lodash');
const { $: $$ } = await use('execa');
const $ = $$({ verbose: 'full' });

const { stdout } = await $`ls`.pipe`grep js`;
const files = _.filter(_.split(stdout, '\n'), (item) => !_.isEmpty(item));
console.log(JSON.stringify(files, null, 2));