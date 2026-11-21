// Install use-m and @types/node, then run with Node.js 24, Bun, or Deno.
import { use } from 'use-m'

const [path, url] = await use.all<[typeof import('node:path'), typeof import('node:url')]>(
  'node:path',
  'node:url',
)

console.log(path.basename(url.fileURLToPath(import.meta.url)))
