import type { FetchRequestOptions, FetchResponseStatus, ModuleLoader, StandaloneUseM } from '../use.d.cts'

interface SourceResponse extends FetchResponseStatus {
  text(): string | PromiseLike<string>
}

export interface LoadUseMOptions {
  fetch?: ((url: string, init?: FetchRequestOptions) => SourceResponse | PromiseLike<SourceResponse>) | null
  sources?: readonly string[]
  maxAttemptsPerSource?: number
  retryDelayMs?: number
  timeoutMs?: number
  evaluate?: (source: string) => unknown
}

export const DEFAULT_SOURCES: string[]
export function looksLikeUseModule(source: unknown): boolean

export function loadUseM(options?: LoadUseMOptions & { evaluate?: undefined }): Promise<StandaloneUseM>
export function loadUseM<Module extends { use: (...args: never[]) => unknown }>(
  options: LoadUseMOptions & { evaluate: (source: string) => Module | PromiseLike<Module> },
): Promise<Module>
export function loadUseM(options: LoadUseMOptions): Promise<{ use: ModuleLoader }>
