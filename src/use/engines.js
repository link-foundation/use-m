// Source fragment: Node engine policy for automatic npm version selection.
// npmSemver is embedded by the bundle builder, including its ISC license.

const quoteNpmArgument = (argument) => process.platform === 'win32'
  ? `"${argument.replaceAll('"', '\\"')}"`
  : `'${argument.replaceAll("'", "'\\''")}'`;

const supportsNodeEngine = (manifest, nodeVersion) => {
  const engine = manifest?.engines?.node;
  return engine === undefined || engine === '' ||
    (typeof engine === 'string' && npmSemver.satisfies(nodeVersion, engine, { includePrerelease: true }));
};

const selectNodeCompatibleVersion = (metadata, packageName, requestedVersion, nodeVersion, debug) => {
  const manifests = Array.isArray(metadata) ? metadata
    : metadata?.versions && typeof metadata.versions === 'object' && !Array.isArray(metadata.versions)
      ? Object.entries(metadata.versions).map(([version, manifest]) => ({ ...manifest, version }))
      : metadata?.version ? [metadata] : null;
  if (!manifests || manifests.some(manifest => !npmSemver.valid(manifest?.version))) {
    throw new Error('npm registry metadata did not contain valid version manifests.');
  }
  const range = requestedVersion === 'latest' ? '*' : requestedVersion;
  const candidates = manifests.filter(manifest => npmSemver.satisfies(manifest.version, range))
    .sort((a, b) => npmSemver.rcompare(a.version, b.version));
  const selected = candidates.find(manifest => supportsNodeEngine(manifest, nodeVersion));
  if (!selected) {
    const newest = candidates[0];
    const detail = newest ? `; ${packageName}@${newest.version} requires Node ${newest.engines?.node}` : '';
    const error = new Error(
      `No release of ${packageName}@${requestedVersion} is compatible with Node${detail}; ` +
      `running ${nodeVersion}. Pin a version or upgrade Node, or set engineStrict: false to bypass this check.`
    );
    error.code = 'USE_M_UNSUPPORTED_NODE';
    throw error;
  }
  if (selected.version !== candidates[0]?.version) {
    const newest = candidates[0];
    debug(1, `${packageName}@${requestedVersion} is ${newest.version} (engines node ${newest.engines?.node}) — ` +
      `using ${selected.version}, the newest release compatible with Node ${nodeVersion}`);
  }
  return { version: selected.version, ...(selected.engines ? { engines: selected.engines } : {}) };
};
