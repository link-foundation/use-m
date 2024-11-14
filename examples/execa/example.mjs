const { use } = eval(await fetch('https://unpkg.com/use-m/use.js').then(u => u.text()));

const _ = await use('lodash');
const { $: $$ } = await use('execa');
const $ = $$({ verbose: 'full' });

const { stdout } = await $`ls`.pipe`grep js`;
const files = _.filter(_.split(stdout, '\n'), (item) => !_.isEmpty(item));
console.log(JSON.stringify(files, null, 2));