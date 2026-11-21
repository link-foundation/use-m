type Awaitable<T> = T | PromiseLike<T>
type FetchSignal = typeof globalThis extends { AbortController: new () => { signal: infer Signal } }
  ? Signal
  : never

export interface FetchRequestOptions {
  signal?: FetchSignal
  headers?: Record<string, string>
}

export interface FetchResponseStatus {
  ok: boolean
  status: number
  statusText?: string
}

export type PathResolver = (specifier: string) => Awaitable<string>
export type ResolverName = keyof typeof resolvers
export type SpecifierResolver = (
  specifier: string,
  pathResolver: PathResolver,
  options?: UseOptions,
) => Awaitable<string>

export interface NpmResolverOptions {
  engineStrict?: boolean | 'true' | 'false' | 0 | 1 | '0' | '1'
  registry?: string
  npmRegistry?: string
  env?: Record<string, string | undefined>
  fetch?: (url: string, init: FetchRequestOptions) => Awaitable<FetchResponseStatus & {
    json(): Awaitable<unknown>
  }>
  debug?: boolean | number | 'true' | 'false' | '0' | '1' | '2' | 'verbose'
  debugLogger?: (message: string) => void
  warningLogger?: (message: string) => void
  installMaxAttempts?: number
  installRetryDelayMs?: number
  installLock?: boolean
  installLockHeartbeatMs?: number
  installLockStaleMs?: number
  installLockPollMs?: number
  installLockTimeoutMs?: number
  latestVersionCache?: boolean
  latestVersionCacheDirectory?: string
  latestVersionCacheTtlMs?: number
  registryMaxAttempts?: number
  registryRetryDelayMs?: number
  registryRequestTimeoutMs?: number
  registryCliFallback?: boolean
  repair?: boolean
}

export interface UseOptions extends NpmResolverOptions {
  /** Script path or URL used to configure the loader. */
  scriptPath?: string
  meta?: { url?: string }
  pathResolver?: PathResolver
  specifierResolver?: ResolverName | SpecifierResolver
  specifierResolvers?: readonly (ResolverName | SpecifierResolver)[]
  import?: (resolvedSpecifier: string) => Awaitable<unknown>
}

export interface ModuleLoader {
  /** Supply T when you know the shape of the runtime-selected module. */
  <T = unknown>(specifier: string, options?: UseOptions | string): Promise<T>
}

export interface Use {
  /** Supply T when you know the shape of the runtime-selected module. */
  <T = unknown>(specifier: string, options?: UseOptions): Promise<T>
  /** Load specifiers concurrently and return their results in input order. */
  all<Modules extends unknown[]>(...specifiers: { [Index in keyof Modules]: string }): Promise<Modules>
}

export const use: Use
export function makeUse(options?: UseOptions): Promise<ModuleLoader>
export function baseUse<T = unknown>(resolvedSpecifier: string): Promise<T>

export interface ParsedModuleSpecifier {
  packageName: string
  version: string
  modulePath: string
}

export function parseModuleSpecifier(specifier: string): ParsedModuleSpecifier

type PackageResolver = (specifier: string, pathResolver?: PathResolver) => Promise<string>

export const resolvers: {
  builtin<T = unknown>(specifier: string, pathResolver?: PathResolver): Promise<T | null>
  relative<T = unknown>(specifier: string, pathResolver?: PathResolver, callerContext?: string): Promise<T | null>
  npm(specifier: string, pathResolver: PathResolver, options?: NpmResolverOptions): Promise<string>
  bun(specifier: string, pathResolver: PathResolver, options?: Pick<NpmResolverOptions, 'warningLogger'>): Promise<string>
  deno: PackageResolver
  denoNpm: PackageResolver
  skypack: PackageResolver
  jsdelivr: PackageResolver
  unpkg: PackageResolver
  esm: PackageResolver
  jspm: PackageResolver
}

export const networkResolverChain: ResolverName[]
export const denoResolverChain: ResolverName[]

export interface FallbackOptions<Source> {
  maxAttemptsPerSource?: number
  retryDelayMs?: number
  describeSource?: (source: Source) => string
  label?: string
  hint?: string
}

export function loadWithFallback<Source, Result>(
  sources: readonly Source[],
  load: (source: Source, attempt: number) => Awaitable<Result>,
  options?: FallbackOptions<Source>,
): Promise<Awaited<Result>>

/** The callable export object returned by evaluating the standalone use.js bundle. */
export type StandaloneUseM = typeof makeUse & typeof import('./use.d.cts')
