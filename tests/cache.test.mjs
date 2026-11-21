import { describe, test, expect } from '../src/test-adapter.mjs'
import * as api from '../use.mjs'
import { testModuleCache } from './fixtures/module-cache.cjs'

testModuleCache({ describe, test, expect }, api, new URL('../use.mjs', import.meta.url).href)
