import api from './fetch-polyfill.cjs'

export const {
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
} = api

export default fetch
