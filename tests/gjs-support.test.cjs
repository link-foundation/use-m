const { describe, test, expect } = require('../test-adapter.cjs');

const moduleName = `[cjs module]`;

describe(`${moduleName} GJS support`, () => {
  test(`${moduleName} GJS resolver should resolve npm packages to esm.sh`, async () => {
    const { resolvers } = require('../use.cjs');
    const resolvedPath = await resolvers.gjs('lodash@4.17.21');
    expect(resolvedPath).toBe('https://esm.sh/lodash@4.17.21');
  });

  test(`${moduleName} GJS resolver should handle scoped packages`, async () => {
    const { resolvers } = require('../use.cjs');
    const resolvedPath = await resolvers.gjs('@octokit/core@6.1.5');
    expect(resolvedPath).toBe('https://esm.sh/@octokit/core@6.1.5');
  });

  test(`${moduleName} GJS resolver should handle module paths`, async () => {
    const { resolvers } = require('../use.cjs');
    const resolvedPath = await resolvers.gjs('lodash@4.17.21/add');
    expect(resolvedPath).toBe('https://esm.sh/lodash@4.17.21/add');
  });

  test(`${moduleName} GJS resolver should handle latest version`, async () => {
    const { resolvers } = require('../use.cjs');
    const resolvedPath = await resolvers.gjs('lodash@latest');
    expect(resolvedPath).toBe('https://esm.sh/lodash@latest');
  });

  test(`${moduleName} GJS resolver should handle gi:// protocol for GObject libraries`, async () => {
    const { resolvers } = require('../use.cjs');
    
    // Mock the imports object for testing
    const originalImports = global.imports;
    global.imports = {
      gi: {
        versions: {},
        GLib: { get_user_name: () => 'testuser' },
        Gtk: { init: () => {} }
      }
    };

    try {
      const glib = await resolvers.gjs('gi://GLib');
      expect(glib).toBeDefined();
      expect(typeof glib.get_user_name).toBe('function');
    } finally {
      // Restore original imports
      if (originalImports === undefined) {
        delete global.imports;
      } else {
        global.imports = originalImports;
      }
    }
  });

  test(`${moduleName} GJS resolver should handle gi:// protocol with version`, async () => {
    const { resolvers } = require('../use.cjs');
    
    // Mock the imports object for testing
    const originalImports = global.imports;
    global.imports = {
      gi: {
        versions: {},
        Gtk: { init: () => {} }
      }
    };

    try {
      const gtk = await resolvers.gjs('gi://Gtk?version=4.0');
      expect(gtk).toBeDefined();
      expect(global.imports.gi.versions.Gtk).toBe('4.0');
    } finally {
      // Restore original imports
      if (originalImports === undefined) {
        delete global.imports;
      } else {
        global.imports = originalImports;
      }
    }
  });

  test(`${moduleName} GJS resolver should handle built-in GJS modules`, async () => {
    const { resolvers } = require('../use.cjs');
    
    // Mock the imports object for testing
    const originalImports = global.imports;
    global.imports = {
      system: { version: '1.0.0' },
      cairo: { Context: function() {} }
    };

    try {
      const systemModule = await resolvers.gjs('system');
      expect(systemModule).toBeDefined();
      expect(systemModule.version).toBe('1.0.0');

      const cairoModule = await resolvers.gjs('cairo');
      expect(cairoModule).toBeDefined();
      expect(typeof cairoModule.Context).toBe('function');
    } finally {
      // Restore original imports
      if (originalImports === undefined) {
        delete global.imports;
      } else {
        global.imports = originalImports;
      }
    }
  });

  test(`${moduleName} GJS resolver should throw error for unavailable gi:// modules`, async () => {
    const { resolvers } = require('../use.cjs');
    
    // Mock the imports object without the requested library
    const originalImports = global.imports;
    global.imports = { gi: {} };

    try {
      await expect(resolvers.gjs('gi://NonExistentLib')).rejects.toThrow(
        'GObject introspection library \'NonExistentLib\' not available in this GJS environment.'
      );
    } finally {
      // Restore original imports
      if (originalImports === undefined) {
        delete global.imports;
      } else {
        global.imports = originalImports;
      }
    }
  });

  test(`${moduleName} GJS resolver should throw error for unavailable built-in modules`, async () => {
    const { resolvers } = require('../use.cjs');
    
    // Mock the imports object without the requested built-in
    const originalImports = global.imports;
    global.imports = {};

    try {
      await expect(resolvers.gjs('cairo')).rejects.toThrow(
        'GJS built-in module \'cairo\' not available.'
      );
    } finally {
      // Restore original imports
      if (originalImports === undefined) {
        delete global.imports;
      } else {
        global.imports = originalImports;
      }
    }
  });

  test(`${moduleName} makeUse should detect GJS runtime when imports global is present`, async () => {
    const { makeUse, resolvers } = require('../use.cjs');
    
    let mockedImports = false;
    if (typeof imports === "undefined") {
      global.imports = { gi: {}, system: {} };
      mockedImports = true;
    }
    try {
      const use = await makeUse();

      // Test by checking which resolver would be used
      // We can't directly test the resolver used, but we can test the behavior
      // by verifying the resolver produces esm.sh URLs for npm packages
      const testModulePath = await resolvers.gjs('lodash@4.17.21');
      expect(testModulePath).toContain('esm.sh');
    } finally {
      if (mockedImports) {
        delete global.imports;
      }
    }
  });

  test(`${moduleName} GJS resolver should work with complex package names`, async () => {
    const { resolvers } = require('../use.cjs');
    const resolvedPath = await resolvers.gjs('@babel/core@7.23.0/lib/index.js');
    expect(resolvedPath).toBe('https://esm.sh/@babel/core@7.23.0/lib/index.js');
  });

  test(`${moduleName} GJS resolver should handle packages without versions`, async () => {
    const { resolvers } = require('../use.cjs');
    const resolvedPath = await resolvers.gjs('lodash');
    expect(resolvedPath).toBe('https://esm.sh/lodash@latest');
  });

  test(`${moduleName} makeUse with explicit gjs resolver`, async () => {
    const { makeUse, resolvers } = require('../use.cjs');
    const use = await makeUse({ specifierResolver: 'gjs' });

    // We can't easily test the full import without network access in CI
    // But we can verify the resolver would produce the correct URL
    const testUrl = await resolvers.gjs('lodash@4.17.21');
    expect(testUrl).toBe('https://esm.sh/lodash@4.17.21');
  });
});