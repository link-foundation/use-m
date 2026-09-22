#!/usr/bin/env bash

set -eu

npm_version="${NPM_VERSION:-11.17.0}"
probe_root="$(mktemp -d)"
npm_command=(npx -y "npm@${npm_version}")

echo "probe root: ${probe_root}"
echo "node: $(node --version)"
echo "npm: $("${npm_command[@]}" --version)"

run_case() {
  case_name="$1"
  second_install="$2"
  prefix="${probe_root}/${case_name}"
  mkdir -p "$prefix"

  "${npm_command[@]}" install -g --prefix "$prefix" \
    zx-v-latest@npm:zx@8.8.5 >/dev/null

  set +e
  case "$second_install" in
    normal)
      "${npm_command[@]}" install -g --prefix "$prefix" \
        zx-v-8.8.5@npm:zx@8.8.5
      ;;
    no-bin-links)
      "${npm_command[@]}" install -g --prefix "$prefix" --no-bin-links \
        zx-v-8.8.5@npm:zx@8.8.5
      ;;
    failed-then-no-bin-links)
      "${npm_command[@]}" install -g --prefix "$prefix" \
        zx-v-8.8.5@npm:zx@8.8.5 >/dev/null 2>&1
      "${npm_command[@]}" install -g --prefix "$prefix" --no-bin-links \
        zx-v-8.8.5@npm:zx@8.8.5
      ;;
    failed-then-force-no-bin-links)
      "${npm_command[@]}" install -g --prefix "$prefix" \
        zx-v-8.8.5@npm:zx@8.8.5 >/dev/null 2>&1
      "${npm_command[@]}" install -g --prefix "$prefix" --force --no-bin-links \
        zx-v-8.8.5@npm:zx@8.8.5
      ;;
  esac
  status=$?
  set -e

  echo "case: ${case_name}; status: ${status}"
  find "$prefix/lib/node_modules" -maxdepth 1 -mindepth 1 -type d -print | sort
  find "$prefix/bin" -maxdepth 1 -mindepth 1 -print 2>/dev/null | sort
}

run_case normal normal
run_case no-bin-links no-bin-links
run_case failed-then-no-bin-links failed-then-no-bin-links
run_case failed-then-force-no-bin-links failed-then-force-no-bin-links
