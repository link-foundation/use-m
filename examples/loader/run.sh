#!/bin/sh
set -eu

cd "$(dirname "$0")/../.."
exec node --loader ./src/loader.js ./examples/loader/loader.mjs
