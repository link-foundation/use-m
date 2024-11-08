#!/usr/bin/env zx --verbose

const use = await fetch('https://unpkg.com/use-m@5/src/use.js')
  .then(response => response.text())
  .then(code => eval(code)());
  
const _ = await use('lodash@latest');

const { stdout } = await $`ls`.pipe`grep js`;
const files = _.filter(_.split(stdout, '\n'), (item) => !_.isEmpty(item));
console.log(files);