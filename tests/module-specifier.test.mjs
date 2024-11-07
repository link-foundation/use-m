describe('parseModuleSpecifier', () => {
  function parseModuleSpecifier(moduleSpecifier) {
    const regex = /^(?<packageName>@?([^@/]+\/)?[^@/]+)?(?:@(?<version>[^/]+))?(?<path>(?:\/[^@]+)*)?$/;
    const match = moduleSpecifier.match(regex);
    if (!match || !match.groups.packageName) {
      throw new Error(
        `Failed to parse package identifier '${moduleSpecifier}'. Please specify a version (e.g., 'lodash@4.17.21' or '@chakra-ui/react@1.0.0').`
      );
    }
    const { packageName, version = 'latest', path = '' } = match.groups;
    return { packageName, version, path };
  }

  test('parses package with name and version', () => {
    const result = parseModuleSpecifier('lodash@4.17.21');
    expect(result).toEqual({
      packageName: 'lodash',
      version: '4.17.21',
      path: '',
    });
  });

  test('parses scoped package with name and version', () => {
    const result = parseModuleSpecifier('@chakra-ui/react@1.0.0');
    expect(result).toEqual({
      packageName: '@chakra-ui/react',
      version: '1.0.0',
      path: '',
    });
  });

  test('parses package with name, version, and inner path', () => {
    const result = parseModuleSpecifier('lodash@4.17.21/path/to/module');
    expect(result).toEqual({
      packageName: 'lodash',
      version: '4.17.21',
      path: '/path/to/module',
    });
  });

  test('parses package with name, version, and inner path', () => {
    const result = parseModuleSpecifier('lodash@latest/path/to/module');
    expect(result).toEqual({
      packageName: 'lodash',
      version: 'latest',
      path: '/path/to/module',
    });
  });

  test('parses scoped package with name, version, and inner path', () => {
    const result = parseModuleSpecifier('@chakra-ui/react@1.0.0/path/to/module');
    expect(result).toEqual({
      packageName: '@chakra-ui/react',
      version: '1.0.0',
      path: '/path/to/module',
    });
  });

  test('parses scoped package with name', () => {
    const result = parseModuleSpecifier('lodash');
    expect(result).toEqual({
      packageName: 'lodash',
      version: 'latest',
      path: '',
    });
  });

  test('parses scoped package with name', () => {
    const result = parseModuleSpecifier('@chakra-ui/react');
    expect(result).toEqual({
      packageName: '@chakra-ui/react',
      version: 'latest',
      path: '',
    });
  });

  test('throws error for invalid package identifier', () => {
    expect(() => parseModuleSpecifier('invalid@identifier/with@extra@symbols')).toThrow(
      "Failed to parse package identifier 'invalid@identifier/with@extra@symbols'. Please specify a version (e.g., 'lodash@4.17.21' or '@chakra-ui/react@1.0.0')."
    );
  });
});