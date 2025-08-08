const { describe, test, expect, jest, isBun } = require('./test-environment.cjs');

jest.setTimeout(15000);

const runtime = isBun ? 'Bun' : 'Node';

describe(`Module constructor compatibility (${runtime})`, () => {
  const { Module } = require('module');
  
  describe('module.constructor.Module property', () => {
    test('module.constructor behavior in different environments', () => {
      // Both Bun and Jest wrap modules, so module.constructor is Object
      // Only in pure Node.js (without Jest) would module.constructor be Module
      expect(module.constructor.name).toBe('Object');
      expect(module.constructor === Module).toBe(false);
    });

    test('module.constructor.Module availability', () => {
      // In both Bun and Jest environments, module.constructor.Module is undefined
      // because module.constructor is Object, not Module
      expect(module.constructor.Module).toBeUndefined();
    });

    test('module instanceof Module check', () => {
      // In both Bun and Jest environments, module is not an instance of Module
      // because they wrap modules differently
      expect(module instanceof Module).toBe(false);
    });
  });

  describe('Module instance creation', () => {
    test('new Module() should create valid instance', () => {
      const testModule = new Module('test-module', null);
      
      expect(testModule).toBeDefined();
      expect(testModule.id).toBe('test-module');
      expect(testModule.loaded).toBe(false);
      expect(typeof testModule.require).toBe('function');
    });

    test('Module instance should have correct constructor chain', () => {
      const testModule = new Module('test-module', null);
      
      if (isBun) {
        // In Bun, even new Module() instances have wrong constructor
        expect(testModule.constructor.name).toBe('Object');
        expect(testModule.constructor.Module).toBeUndefined();
        expect(testModule instanceof Module).toBe(false);
      } else {
        expect(testModule.constructor.name).toBe('Module');
        expect(testModule.constructor.Module).toBe(Module);
        expect(testModule instanceof Module).toBe(true);
      }
    });
  });

  describe('use-m getScriptUrl pattern', () => {
    test('should detect Module from module.constructor.Module', () => {
      // This simulates the exact pattern use-m uses
      function getModuleConstructor(mod) {
        return mod.constructor && mod.constructor.Module;
      }
      
      const ModuleConstructor = getModuleConstructor(module);
      
      // In both Jest and Bun, module.constructor.Module is undefined
      // Only in pure Node.js (not Jest) would this return Module
      expect(ModuleConstructor).toBeUndefined();
      
      // Document the actual runtime behavior
      const runtime = isBun ? 'Bun' : 'Jest/Node';
      console.log(`[${runtime}] module.constructor.Module:`, ModuleConstructor);
      console.log(`[${runtime}] module.constructor.name:`, module.constructor.name)
    });

    test('should validate module instanceof check', () => {
      // This simulates use-m's validation
      function validateModule(mod) {
        const ModuleConstructor = mod.constructor && mod.constructor.Module;
        if (!ModuleConstructor) {
          return 'No module.constructor.Module found';
        }
        if (!(mod instanceof ModuleConstructor)) {
          return 'Not an instance of Module';
        }
        return 'Valid';
      }
      
      const result = validateModule(module);
      
      // Both Jest and Bun environments don't have module.constructor.Module
      expect(result).toBe('No module.constructor.Module found');
      
      // Document actual behavior across environments
      const runtime = isBun ? 'Bun' : 'Jest/Node';
      console.log(`[${runtime}] Validation result:`, result);
      console.log(`[${runtime}] module instanceof Module:`, module instanceof Module)
    });
  });

  describe('eval context behavior', () => {
    test('Module access in eval', () => {
      const evalCode = `
        (function() {
          const { Module } = require('module');
          return {
            hasModule: typeof Module !== 'undefined',
            moduleType: typeof Module,
            canCreate: false,
            error: null
          };
        })()
      `;
      
      const result = eval(evalCode);
      expect(result.hasModule).toBe(true);
      expect(result.moduleType).toBe('function');
    });

    test('module.constructor.Module in eval with passed module', () => {
      const evalCode = `
        (function(mod) {
          return {
            constructorName: mod.constructor && mod.constructor.name,
            hasConstructorModule: !!(mod.constructor && mod.constructor.Module),
            moduleId: mod.id
          };
        })
      `;
      
      const testModule = new Module('eval-test', null);
      const fn = eval(evalCode);
      const result = fn(testModule);
      
      expect(result.moduleId).toBe('eval-test');
      
      if (isBun) {
        expect(result.constructorName).toBe('Object');
        expect(result.hasConstructorModule).toBe(false);
      } else {
        expect(result.constructorName).toBe('Module');
        expect(result.hasConstructorModule).toBe(true);
      }
    });

    test('CDN use-m simulation', () => {
      // Simulate loading use-m from CDN and calling it
      const simulateCDNUse = () => {
        const evalCode = `
          (function() {
            // Simplified use-m getScriptUrl logic
            function getScriptUrl(module) {
              const Module = module.constructor && module.constructor.Module;
              if (!Module) {
                throw new Error('module.constructor.Module not found');
              }
              if (!(module instanceof Module)) {
                throw new Error('Provided module is not an instance of Module');
              }
              return 'success';
            }
            
            return { getScriptUrl };
          })()
        `;
        
        const useMock = eval(evalCode);
        const testModule = new (require('module').Module)('cdn-test', null);
        
        try {
          return useMock.getScriptUrl(testModule);
        } catch (e) {
          return e.message;
        }
      };
      
      const result = simulateCDNUse();
      
      if (isBun) {
        expect(result).toBe('module.constructor.Module not found');
      } else {
        expect(result).toBe('success');
      }
    });
  });

  describe('Alternative Module access patterns', () => {
    test('require("module").Module', () => {
      const { Module: RequiredModule } = require('module');
      expect(RequiredModule).toBe(Module);
      expect(typeof RequiredModule).toBe('function');
    });

    test('Direct Module variable', () => {
      expect(typeof Module).toBe('function');
      expect(Module.name).toBe('Module');
    });

    test('Module._resolveFilename existence', () => {
      expect(typeof Module._resolveFilename).toBe('function');
    });

    test('Module._extensions', () => {
      expect(Module._extensions).toBeDefined();
      expect(typeof Module._extensions).toBe('object');
      expect(Module._extensions['.js']).toBeDefined();
    });
  });
});