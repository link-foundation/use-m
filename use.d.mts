import type * as api from './use.d.cts'

export type {
  FallbackOptions,
  FetchRequestOptions,
  FetchResponseStatus,
  ModuleLoader,
  NpmResolverOptions,
  ParsedModuleSpecifier,
  PathResolver,
  ResolverName,
  SpecifierResolver,
  StandaloneUseM,
  Use,
  UseOptions,
} from './use.d.cts'

export declare const {
  baseUse,
  denoResolverChain,
  loadWithFallback,
  makeUse,
  networkResolverChain,
  parseModuleSpecifier,
  resolvers,
  use,
}: typeof api
