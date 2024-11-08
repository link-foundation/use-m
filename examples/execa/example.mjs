  const use = await fetch('https://unpkg.com/use-m/src/use.js')
    .then(response => response.text())
    .then(code => eval(code)({
      metaUrl: import.meta.url,
    }));

  const _ = await use('lodash@latest');
  const { $: $$ } = await use('execa@latest');
  const $ = $$({ verbose: 'full' });

  const { stdout } = await $`ls`.pipe`grep js`;
  const files = _.filter(_.split(stdout, '\n'), (item) => !_.isEmpty(item));
  console.log(files);