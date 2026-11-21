import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

// Inspect repository manifests without descending into installed dependencies.
export function checkPublishablePackages(directory = rootDir) {
  const publishable = []
  function visit(current) {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      if (entry.name === '.git' || entry.name === 'node_modules') continue
      const entryPath = path.join(current, entry.name)
      if (entry.isDirectory()) visit(entryPath)
      else if (entry.name === 'package.json') {
        const manifest = JSON.parse(readFileSync(entryPath, 'utf8'))
        if (manifest.private !== true) publishable.push({ path: path.relative(directory, entryPath), name: manifest.name })
      }
    }
  }
  visit(directory)
  if (publishable.length !== 1 || publishable[0].path !== 'package.json' || publishable[0].name !== 'use-m') {
    throw new Error(`Only the root use-m package may be publishable. Mark every other package private: ${JSON.stringify(publishable)}`)
  }
  return publishable
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  for (const manifest of checkPublishablePackages()) console.log(`${manifest.name}: ${manifest.path}`)
}
