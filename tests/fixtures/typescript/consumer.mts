import { baseUse, denoResolverChain, loadWithFallback, makeUse, networkResolverChain, parseModuleSpecifier, resolvers, use } from 'use-m'
import { use as esmUse } from 'use-m/use.mjs'
import { use as cjsUse } from 'use-m/use.cjs'
import { DEFAULT_SOURCES, loadUseM, looksLikeUseModule } from 'use-m/load'
import { loadUseM as esmLoad } from 'use-m/load.mjs'
import { loadUseM as cjsLoad } from 'use-m/load.cjs'
import fetch, { installFetchGlobals, WEB_GLOBAL_NAMES } from 'use-m/fetch-polyfill'
import { Headers } from 'use-m/fetch-polyfill.js'
import cjsPolyfill from 'use-m/fetch-polyfill.cjs'
import type { UseOptions } from 'use-m'

const options: UseOptions = {
  specifierResolver: (name, resolve, options) => resolve(parseModuleSpecifier(name).packageName),
  scriptPath: import.meta.url,
  import: async (url) => ({ url }),
  engineStrict: false,
}
const configured = await makeUse(options)
const configuredResult: { url: string } = await configured<{ url: string }>('example', { debug: 'verbose' })
const callerResult: string = await configured<string>('./fixture.ts', import.meta.url)
const fs: typeof import('node:fs/promises') = await use<typeof import('node:fs/promises')>('node:fs/promises')
const tuple: [string, number] = await use.all<[string, number]>('one@1.0.0', 'two@2.0.0')
const inferredTuple: [unknown, unknown] = await use.all('one', 'two')
const emptyTuple: [] = await use.all()
const fallback: number = await loadWithFallback([1, 2] as const, (source, attempt) => source + attempt, {
  describeSource: (source: 1 | 2) => String(source),
})
const npmPath: string = await resolvers.npm('example', (id) => id, { registryMaxAttempts: 1 })
const direct: number = await baseUse<number>('example')
const aliases: [typeof use, typeof use] = [esmUse, cjsUse]
const loaderAliases: [typeof loadUseM, typeof loadUseM] = [esmLoad, cjsLoad]
const sources: string[] = DEFAULT_SOURCES
const valid: boolean = looksLikeUseModule(false)
const bootstrapped = await loadUseM()
await loadUseM({ fetch: globalThis.fetch })
const viaBootstrap: typeof use = bootstrapped.use
const bootstrappedLoader = await bootstrapped({ specifierResolvers: denoResolverChain })
const customBootstrap = await loadUseM({ evaluate: () => ({ use, extra: 5 }) })
const extra: number = customBootstrap.extra
const target = installFetchGlobals({ sentinel: true })
const sentinel: boolean = target.sentinel
const name: string = WEB_GLOBAL_NAMES[0]
const headers = new Headers()
const response = new cjsPolyfill.Response()
const polyfilledFetch: typeof fetch = target.fetch

const untyped = await use('untyped')
// @ts-expect-error Runtime-selected module shapes must be narrowed or supplied explicitly
untyped.someExport
// @ts-expect-error One result type is required for each specifier
await use.all<[string, number]>('only-one')
// @ts-expect-error Specifiers must be strings
await use(42)
// @ts-expect-error Unknown resolver key
await makeUse({ specifierResolvers: ['absent'] })
// @ts-expect-error The importer is a function
await use('example', { import: 'esm' })

await makeUse({ specifierResolvers: networkResolverChain })
