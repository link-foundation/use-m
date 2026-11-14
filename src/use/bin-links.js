// Source fragment: the global executables npm links for use-m's npm aliases.
// Generated bundles concatenate this file; do not import it directly.
//
// `npm install -g <alias>@npm:<package>@<version>` links every executable the
// package declares into the one directory that all global packages share. Every
// versioned alias of a package therefore competes for the same names (issue
// #73), and an alias that use-m deletes after a failed install used to leave
// its links pointing at nothing. npm refuses to replace a link that points
// outside the package it installs (EEXIST), so one dangling link blocked every
// later install of that package until someone deleted it by hand (issue #78).
//
// use-m keeps linking executables on the first attempt. `--no-bin-links` also
// skips the `node_modules/.bin` links of dependencies, and install scripts such
// as `prebuild-install || node-gyp rebuild` run those (see
// experiments/issue-78/no-bin-links-dependency-scripts.sh).

// read-cmd-shim's patterns for the shims npm writes for each executable on
// Windows: `<name>.cmd`, `<name>.ps1` and the extensionless `<name>` (sh).
const binShimTargetPatterns = {
  '.cmd': /"%(?:~dp0|dp0%)\\([^"]+?)"\s+%[*]/,
  '.ps1': /"[$]basedir[/]([^"]+?)"\s+[$]args/,
  '': /"[$]basedir[/]([^"]+?)"\s+"[$]@"/,
};
// npm's shims are a few hundred bytes. Larger files are never read.
const binShimMaxBytes = 64 * 1024;

const createAliasBinLinks = ({ path, readdir, readFile, readlink, stat, unlink, debug }) => {
  // npm links global executables into <prefix>/bin, next to
  // <prefix>/lib/node_modules, on POSIX, and into <prefix> itself, next to
  // <prefix>/node_modules, on Windows.
  const getBinDirectory = (globalModulesPath) => {
    const parent = path.dirname(globalModulesPath);
    return path.basename(parent) === 'lib' ? path.join(path.dirname(parent), 'bin') : parent;
  };

  // Shims exist only on Windows or in a Windows-style prefix. POSIX bin
  // directories such as /usr/bin are full of unrelated binaries that must not
  // be read.
  const readsShims = (globalModulesPath) =>
    process.platform === 'win32' || getBinDirectory(globalModulesPath) === path.dirname(globalModulesPath);

  // The absolute path an executable link or shim points at, or null when the
  // entry is neither.
  const readBinTarget = async (binPath, shims) => {
    try {
      return path.resolve(path.dirname(binPath), await readlink(binPath));
    } catch {
      if (!shims) {
        return null;
      }
    }
    try {
      const stats = await stat(binPath);
      if (!stats.isFile() || stats.size > binShimMaxBytes) {
        return null;
      }
      const extension = path.extname(binPath).toLowerCase();
      const pattern = binShimTargetPatterns[extension] ?? binShimTargetPatterns[''];
      const match = (await readFile(binPath, 'utf8')).match(pattern);
      return match ? path.resolve(path.dirname(binPath), match[1].replace(/\\/g, '/')) : null;
    } catch {
      return null;
    }
  };

  // The top-level directory of the global root that contains `target`, or null
  // when `target` lies outside the global root.
  const getOwnerAlias = (globalModulesPath, target) => {
    const relativeTarget = path.relative(globalModulesPath, target);
    if (!relativeTarget
      || path.isAbsolute(relativeTarget)
      || relativeTarget === '..'
      || relativeTarget.startsWith(`..${path.sep}`)) {
      return null;
    }
    return relativeTarget.split(path.sep)[0];
  };

  // Any error other than "does not exist" counts as existing, so a link is
  // never removed because of a permission problem or a transient failure.
  const targetExists = async (target) => {
    try {
      await stat(target);
      return true;
    } catch (error) {
      return error?.code !== 'ENOENT' && error?.code !== 'ENOTDIR';
    }
  };

  // Ownership is decided from where the link points. A dangling link carries no
  // package.json to read, and nothing else tells who created it.
  const getAliasBinLink = async (binPath, globalModulesPath, shims = readsShims(globalModulesPath)) => {
    const target = await readBinTarget(binPath, shims);
    const ownerAlias = target && getOwnerAlias(globalModulesPath, target);
    return ownerAlias ? { binPath, target, ownerAlias } : null;
  };

  const unlinkBin = async (binPath, reason) => {
    try {
      await unlink(binPath);
      debug(1, `removed ${reason} executable link ${binPath}`);
      return true;
    } catch (error) {
      debug(1, `could not remove ${reason} executable link ${binPath}: ${error?.code ?? error}`);
      return false;
    }
  };

  // Best effort: unlink every global executable that points into the global
  // root and that `owned(link)` accepts. Returns the removed paths.
  const removeBinLinks = async (globalModulesPath, reason, owned) => {
    const binDirectory = getBinDirectory(globalModulesPath);
    const shims = readsShims(globalModulesPath);
    let entries;
    try {
      entries = await readdir(binDirectory, { withFileTypes: true });
    } catch {
      return [];
    }
    const removed = [];
    for (const entry of entries) {
      if (!entry.isSymbolicLink() && !(shims && entry.isFile())) {
        continue;
      }
      const link = await getAliasBinLink(path.join(binDirectory, entry.name), globalModulesPath, shims);
      if (link && await owned(link) && await unlinkBin(link.binPath, reason)) {
        removed.push(link.binPath);
      }
    }
    return removed;
  };

  // Called whenever use-m deletes an alias directory, so the executables npm
  // linked into it do not outlive it.
  const removeAliasBinLinks = (packagePath) => {
    const alias = path.basename(packagePath);
    return removeBinLinks(path.dirname(packagePath), 'orphaned', async link => link.ownerAlias === alias);
  };

  const isStaleAliasBinLink = async (link, aliasPrefix) =>
    Boolean(link?.ownerAlias.startsWith(aliasPrefix)) && !await targetExists(link.target);

  // Removes every dangling executable of any alias of this package, including
  // the one npm reported, which may lie outside the derived bin directory. A
  // package can declare several executables, and each one would fail the next
  // install on its own.
  const removeStaleAliasBinLinks = async ({ binPath, globalModulesPath, aliasPrefix }) => {
    const removed = await removeBinLinks(
      globalModulesPath,
      'stale',
      link => isStaleAliasBinLink(link, aliasPrefix)
    );
    if (!removed.includes(binPath)
      && await isStaleAliasBinLink(await getAliasBinLink(binPath, globalModulesPath), aliasPrefix)
      && await unlinkBin(binPath, 'stale')) {
      removed.push(binPath);
    }
    return removed;
  };

  // Turns an npm EEXIST failure into the conflicting executable when another
  // alias of the same package owns it: `stale` when its target is gone (an
  // alias use-m removed), otherwise a live executable of that alias. Returns
  // null for anything else, which use-m must leave alone.
  const findAliasBinConflict = async ({ errorText, alias, aliasPrefix, packageName, globalModulesPath }) => {
    const pathMatch = errorText.match(/(?:^|\n)npm (?:error|ERR!) path ([^\r\n]+)/);
    if (!/\bEEXIST\b/.test(errorText) || !pathMatch) {
      return null;
    }
    const link = await getAliasBinLink(pathMatch[1].trim(), globalModulesPath);
    if (!link || link.ownerAlias === alias || !link.ownerAlias.startsWith(aliasPrefix)) {
      return null;
    }
    if (!await targetExists(link.target)) {
      return { ...link, stale: true };
    }
    try {
      const ownerPackageJson = JSON.parse(
        await readFile(path.join(globalModulesPath, link.ownerAlias, 'package.json'), 'utf8')
      );
      return ownerPackageJson.name === packageName ? { ...link, stale: false } : null;
    } catch {
      return null;
    }
  };

  return { findAliasBinConflict, removeAliasBinLinks, removeStaleAliasBinLinks };
};
