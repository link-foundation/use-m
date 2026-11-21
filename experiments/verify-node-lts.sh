#!/usr/bin/env bash
# Runs the built-in test files and the backward-compatibility experiment under
# several Node.js binaries, so the dynamic built-in resolver (issue #50) can be
# checked against every supported LTS line instead of only the one in CI.
#
# Usage:
#   experiments/verify-node-lts.sh /path/to/node-v20/bin/node /path/to/node-v22/bin/node ...
#   experiments/verify-node-lts.sh            # defaults to every node in /tmp/nodes/*/bin/node plus the one on PATH
#
# Download a version with, for example:
#   curl -fsSL https://nodejs.org/dist/v22.23.2/node-v22.23.2-linux-x64.tar.xz | tar -xJ -C /tmp/nodes
#
# Writes one log per version into docs/case-studies/issue-50/ci-logs/.

set -uo pipefail

repository="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
logDirectory="${repository}/docs/case-studies/issue-50/ci-logs"
mkdir -p "${logDirectory}"

binaries=("$@")
if [ ${#binaries[@]} -eq 0 ]; then
  for candidate in /tmp/nodes/*/bin/node; do
    [ -x "${candidate}" ] && binaries+=("${candidate}")
  done
  binaries+=("$(command -v node)")
fi

# The baseline is main's entry file: the experiment compares what the hardcoded
# table used to return against what the dynamic resolver returns now.
baseline=/tmp/use-baseline.mjs
git -C "${repository}" show main:src/use.mjs > "${baseline}"

builtinTests=(
  tests/builtin-backward-compatibility.test.mjs
  tests/builtin-backward-compatibility.test.cjs
  tests/builtin-nodejs.test.mjs
  tests/builtin-nodejs.test.cjs
  tests/builtin-universal.test.mjs
  tests/builtin-universal.test.cjs
  tests/builtin-errors.test.mjs
  tests/builtin-errors.test.cjs
  tests/dynamic-builtins.test.mjs
  tests/dynamic-builtins.test.cjs
  tests/fs-promises.test.mjs
)

failures=0
for binary in "${binaries[@]}"; do
  version="$("${binary}" -v)"
  log="${logDirectory}/node-${version}.log"
  echo "=== ${version} (${binary}) -> ${log}"

  # A subshell so the summary `exit` ends this version's log, not the script.
  (
    echo "# ${version} (${binary})"
    echo
    echo "## experiments/builtin-backward-compatibility.mjs"
    "${binary}" "${repository}/experiments/builtin-backward-compatibility.mjs" "${baseline}"
    experimentStatus=$?
    echo "experiment exit=${experimentStatus}"
    echo
    echo "## jest ${builtinTests[*]}"
    NODE_OPTIONS="--experimental-vm-modules" "${binary}" "${repository}/node_modules/.bin/jest" \
      --rootDir "${repository}" --runInBand "${builtinTests[@]}"
    jestStatus=$?
    echo "jest exit=${jestStatus}"
    exit $(( experimentStatus | jestStatus ))
  ) > "${log}" 2>&1

  status=$?
  if [ ${status} -ne 0 ]; then
    failures=$(( failures + 1 ))
    echo "    FAILED (see ${log})"
  else
    echo "    ok"
  fi
done

echo
echo "${#binaries[@]} Node.js version(s) checked, ${failures} failing."
exit $(( failures > 0 ? 1 : 0 ))
