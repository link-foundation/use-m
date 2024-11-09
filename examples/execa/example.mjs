const { use } = eval(await fetch('https://unpkg.com/use-m/use.js').then(code => code.text()));

const _ = await use('lodash@latest');
const { $: $$ } = await use('execa@latest');
const $ = $$({ verbose: 'full' });

const { stdout } = await $`ls`.pipe`grep js`;
const files = _.filter(_.split(stdout, '\n'), (item) => !_.isEmpty(item));
console.log(JSON.stringify(files, null, 2));