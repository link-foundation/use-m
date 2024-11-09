#!/usr/bin/env zx --verbose

const use = await eval(
  await fetch('https://unpkg.com/use-m/use.js')
    .then(response => response.text())
)();
  
const _ = await use('lodash@latest');

const { stdout } = await $`ls`.pipe`grep js`;
const files = _.filter(_.split(stdout, '\n'), (item) => !_.isEmpty(item));
console.log(files);