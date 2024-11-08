// import { createRequire } from 'module';

const use = await eval(
  await fetch('https://unpkg.com/use-m@6/use.js')
    .then(response => response.text())
)({
  meta: import.meta,
  // pathResolver: createRequire(import.meta.url).resolve,
  // pathResolver: import.meta.resolve,
});

const _ = await use('lodash@latest');
const { $: $$ } = await use('execa@latest');
const $ = $$({ verbose: 'full' });

const { stdout } = await $`ls`.pipe`grep js`;
const files = _.filter(_.split(stdout, '\n'), (item) => !_.isEmpty(item));
console.log(files);