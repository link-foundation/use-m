#!/usr/bin/env bash
# Shows that `npm install -g --no-bin-links` also skips the dependency
# `node_modules/.bin` links that install scripts rely on, e.g.
# "install": "prebuild-install || node-gyp rebuild".
set -u
work=$(mktemp -d)
mkdir -p "$work/helper" "$work/app"
cat > "$work/helper/package.json" <<'J'
{ "name": "helper-tool", "version": "1.0.0", "bin": { "helper-tool": "cli.js" } }
J
printf '#!/usr/bin/env node\nconsole.log("helper ran")\n' > "$work/helper/cli.js"
chmod +x "$work/helper/cli.js"
(cd "$work/helper" && npm pack --silent >/dev/null)
cat > "$work/app/package.json" <<J
{ "name": "app-with-install-script", "version": "1.0.0",
  "bin": { "app-cli": "index.js" },
  "dependencies": { "helper-tool": "file:$work/helper/helper-tool-1.0.0.tgz" },
  "scripts": { "install": "helper-tool" } }
J
echo 'module.exports = 1' > "$work/app/index.js"
(cd "$work/app" && npm pack --silent >/dev/null)
for flags in "" "--no-bin-links"; do
  prefix="$work/prefix-${flags:-default}"
  echo "== npm install -g $flags =="
  npm install -g --prefix "$prefix" --foreground-scripts --dangerously-allow-all-scripts $flags "$work/app/app-with-install-script-1.0.0.tgz" 2>&1 | tail -4
  echo "exit=${PIPESTATUS[0]}; global bin dir: $(ls "$prefix/bin" 2>/dev/null | tr '\n' ' ')"
done
rm -rf "$work"
