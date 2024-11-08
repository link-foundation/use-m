// import { createRequire } from 'module';

const use = await fetch('https://unpkg.com/use-m@5/src/use.js')
  .then(response => response.text())
  .then(code => eval(code)({
    meta: import.meta,
    // baseResolver: createRequire(import.meta.url).resolve,
    // baseResolver: import.meta.resolve,
  }));

const _ = await use('lodash@latest');
const { $: $$ } = await use('execa@latest');
const $ = $$({ verbose: 'full' });

const { stdout } = await $`ls`.pipe`grep js`;
const files = _.filter(_.split(stdout, '\n'), (item) => !_.isEmpty(item));
console.log(files);