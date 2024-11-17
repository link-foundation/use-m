set -e

npm remove -g use-m
npm i -g use-m@8.10.15
node --loader "$(use --lp)" loader.mjs