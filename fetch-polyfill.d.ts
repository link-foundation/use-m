import type api = require('./fetch-polyfill.d.cts')

export declare const {
  Blob,
  CloseEvent,
  ErrorEvent,
  EventSource,
  File,
  FileReader,
  FormData,
  Headers,
  MessageEvent,
  Request,
  Response,
  WebSocket,
  caches,
  fetch,
  installFetchGlobals,
  WEB_GLOBAL_NAMES,
}: typeof api

export default fetch
