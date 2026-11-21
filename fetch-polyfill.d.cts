import type * as Undici from 'undici'
import type { Blob as NodeBlob } from 'node:buffer'

declare const WEB_GLOBAL_NAMES: readonly (
  'Blob' | 'CloseEvent' | 'ErrorEvent' | 'EventSource' | 'File' | 'FileReader' |
  'FormData' | 'Headers' | 'MessageEvent' | 'Request' | 'Response' | 'WebSocket' | 'caches' | 'fetch'
)[]

type FetchGlobals = { Blob: typeof NodeBlob } &
  Pick<typeof Undici, Exclude<(typeof WEB_GLOBAL_NAMES)[number], 'Blob'>>

declare function installFetchGlobals(
  target?: undefined,
  suppliedImplementations?: Partial<FetchGlobals>,
): typeof globalThis & FetchGlobals
declare function installFetchGlobals<T extends object>(
  target: T,
  suppliedImplementations?: Partial<FetchGlobals>,
): T & Omit<FetchGlobals, keyof T>

declare const api: FetchGlobals & {
  default: FetchGlobals['fetch']
  installFetchGlobals: typeof installFetchGlobals
  WEB_GLOBAL_NAMES: typeof WEB_GLOBAL_NAMES
}

export = api
