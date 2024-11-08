// import { createRequire } from 'module';

// const use = await fetch('https://unpkg.com/use-m@6/use.js')
//   .then(response => response.text())
//   .then(code => eval(code)({
//     meta: import.meta,
//     // pathResolver: createRequire(import.meta.url).resolve,
//     // pathResolver: import.meta.resolve,
//   }));

import fs from 'fs/promises';


// const code = await fetch('https://unpkg.com/use-m@6.1.3/use.mjs');

// read file from ./../../use.mjs
// apply import.meta.url
// const code = await fetch(import.meta.resolve('./../../use.mjs'));
// read file using esm fs promises
const code = await fs.readFile(new URL('./../../use.mjs', import.meta.url), 'utf8');

// console.log(code.toString());

// console.log(await code.text());

// const { use } = await import(`data:text/javascript, ${await code.text()}`);
// const { use } = await import(`data:text/javascript, ${code}`);
// charset=utf-8,${encodeURIComponent(code)}
const { makeUse } = (await import(`data:text/javascript,${encodeURIComponent(code)}`)).default;
// const use = await makeUse({ meta: import.meta });


console.log('use', use);

const _ = await use('lodash@latest');
const { $: $$ } = await use('execa@latest');
const $ = $$({ verbose: 'full' });

const { stdout } = await $`ls`.pipe`grep js`;
const files = _.filter(_.split(stdout, '\n'), (item) => !_.isEmpty(item));
console.log(files);