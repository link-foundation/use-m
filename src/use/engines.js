// Source fragment: Node engine policy for automatic npm version selection.
// npmSemver is embedded by the bundle builder, including its ISC license.
//
// Backward compatibility contract: when the release npm would install anyway
// supports the running Node.js, nothing changes. Only an incompatible `latest`
// release (or range match) makes use-m look for an older compatible release,
// and when none exists use-m keeps npm's previous choice unless
// `engineStrict: true` asks it to fail before installation.

const quoteNpmArgument = (argument) => process.platform === 'win32'
  ? `"${argument.replaceAll('"', '\\"')}"`
  : `'${argument.replaceAll("'", "'\\''")}'`;

// `engineStrict` option or USE_M_ENGINE_STRICT: false/0 disables engine-aware
// selection, true/1 additionally fails fast when no compatible release exists,
// anything else keeps the default (select a compatible release when possible).
const parseEngineStrictSetting = (value) => {
  if (value === false || value === 'false' || value === '0' || value === 0) return false;
  if (value === true || value === 'true' || value === '1' || value === 1) return true;
  return undefined;
};

const supportsNodeEngine = (manifest, nodeVersion) => {
  const engine = manifest?.engines?.node;
  return engine === undefined || engine === null || engine === '' ||
    (typeof engine === 'string' && npmSemver.satisfies(nodeVersion, engine, { includePrerelease: true }));
};

const describeNodeEngine = (manifest) => manifest?.engines?.node ?? 'any';

// Normalizes a registry packument, an install-v1 (corgi) document, or the
// output of `npm view <pkg>@<range> version engines deprecated dist-tags --json`
// (an object for one version, an array of objects or plain version strings for
// several) into `{ manifests, latestTag }`.
const normalizeVersionMetadata = (metadata) => {
  const toManifest = (entry) => typeof entry === 'string' ? { version: entry } : entry;
  let manifests = null;
  if (Array.isArray(metadata)) {
    manifests = metadata.map(toManifest);
  } else if (metadata?.versions && typeof metadata.versions === 'object' && !Array.isArray(metadata.versions)) {
    manifests = Object.entries(metadata.versions).map(([version, manifest]) => ({ ...manifest, version }));
  } else if (typeof metadata === 'string' || typeof metadata?.version === 'string') {
    manifests = [toManifest(metadata)];
  }
  if (!manifests || manifests.length === 0 || manifests.some(manifest => !npmSemver.valid(manifest?.version))) {
    throw new Error('npm registry metadata did not contain valid version manifests.');
  }
  const distTags = (Array.isArray(metadata) ? manifests.find(manifest => manifest['dist-tags']) : metadata)?.['dist-tags'];
  const latestTag = npmSemver.valid(distTags?.latest) ? distTags.latest : null;
  return { manifests, latestTag };
};

// Picks the release to install for `latest` or a semver range, mirroring how
// npm itself picks a manifest (npm-pick-manifest): the `latest` dist-tag wins
// when it qualifies; otherwise the highest version, preferring releases whose
// engines support the running Node.js and that are not deprecated. Unlike npm,
// a release whose engines exclude the running Node.js is never selected here.
// Returns `{ version, newest }`, or `{ version: null, newest }` when no
// published release qualifies.
const selectNodeCompatibleVersion = (metadata, requestedVersion, nodeVersion) => {
  const { manifests, latestTag } = normalizeVersionMetadata(metadata);
  const byVersion = new Map(manifests.map(manifest => [manifest.version, manifest]));
  const latestManifest = latestTag ? byVersion.get(latestTag) : undefined;
  const isLatest = requestedVersion === 'latest';
  const range = isLatest ? '*' : requestedVersion;

  if (latestManifest && supportsNodeEngine(latestManifest, nodeVersion) &&
      (isLatest || (npmSemver.satisfies(latestTag, range) && !latestManifest.deprecated))) {
    return { version: latestTag, newest: latestManifest };
  }

  // `latest` never moves past the dist-tag: versions published above it were
  // deliberately not promoted (prereleases, staged majors, mistakes).
  const candidates = manifests
    .filter(manifest => npmSemver.satisfies(manifest.version, range) &&
      (!isLatest || !latestTag || npmSemver.lte(manifest.version, latestTag)))
    .sort((a, b) => npmSemver.rcompare(a.version, b.version));
  const newest = (isLatest && latestManifest) || candidates[0];
  const compatible = candidates.filter(manifest => supportsNodeEngine(manifest, nodeVersion));
  const selected = compatible.find(manifest => !manifest.deprecated) || compatible[0];
  return { version: selected ? selected.version : null, newest };
};

const describeUnsupportedNode = (packageName, requestedVersion, newest, nodeVersion) =>
  `No release of ${packageName}@${requestedVersion} is compatible with Node ${nodeVersion}` +
  (newest ? `; ${packageName}@${newest.version} requires Node ${describeNodeEngine(newest)}` : '') +
  '. Pin a version or upgrade Node.';

const createUnsupportedNodeError = (packageName, requestedVersion, newest, nodeVersion) => {
  const error = new Error(
    `${describeUnsupportedNode(packageName, requestedVersion, newest, nodeVersion)} ` +
    'Remove engineStrict: true (or USE_M_ENGINE_STRICT=true) to let npm install it anyway.'
  );
  error.code = 'USE_M_UNSUPPORTED_NODE';
  return error;
};
