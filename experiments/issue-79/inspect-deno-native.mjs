// Inspect Deno's native npm resolution errors in a package.json project.
for (const name of ['command-stream@0.0.5', 'lodash@4.17.21/add', 'lodash@3', '@octokit/core@latest']) {
  try {
    const loaded = await import(`npm:${name}`);
    console.log('OK', name, Object.keys(loaded).slice(0, 5));
  } catch (error) {
    console.error('FAILED', name, error);
  }
}
