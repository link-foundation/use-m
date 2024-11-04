describe('parsePackageIdentifier', () => {
  function parsePackageIdentifier(packageIdentifier) {
    const regex = /^(?<packageName>@?([^@/]+\/)?[^@/]+)?(?:@(?<version>[^/]+))?(?<path>(?:\/[^@]+)*)?$/;
    const match = packageIdentifier.match(regex);
    if (!match || !match.groups.packageName) {
      throw new Error(
        `Failed to parse package identifier '${packageIdentifier}'. Please specify a version (e.g., 'lodash@4.17.21' or '@chakra-ui/react@1.0.0').`
      );
    }
    const { packageName, version, path = '' } = match.groups;
    if (!version) {
      throw new Error(
        `Package identifier '${packageIdentifier}' is missing a version. Please specify a version (e.g., 'lodash@4.17.21' or '@chakra-ui/react@1.0.0').`
      );
    }
    return { packageName, version, path };
  }

  test('parses package with name and version', () => {
    const result = parsePackageIdentifier('lodash@4.17.21');
    expect(result).toEqual({
      packageName: 'lodash',
      version: '4.17.21',
      path: '',
    });
  });

  test('parses scoped package with name and version', () => {
    const result = parsePackageIdentifier('@chakra-ui/react@1.0.0');
    expect(result).toEqual({
      packageName: '@chakra-ui/react',
      version: '1.0.0',
      path: '',
    });
  });

  test('parses package with name, version, and inner path', () => {
    const result = parsePackageIdentifier('lodash@4.17.21/path/to/module');
    expect(result).toEqual({
      packageName: 'lodash',
      version: '4.17.21',
      path: '/path/to/module',
    });
  });

  test('parses package with name, version, and inner path', () => {
    const result = parsePackageIdentifier('lodash@latest/path/to/module');
    expect(result).toEqual({
      packageName: 'lodash',
      version: 'latest',
      path: '/path/to/module',
    });
  });

  test('parses scoped package with name, version, and inner path', () => {
    const result = parsePackageIdentifier('@chakra-ui/react@1.0.0/path/to/module');
    expect(result).toEqual({
      packageName: '@chakra-ui/react',
      version: '1.0.0',
      path: '/path/to/module',
    });
  });

  test('throws error if version is missing', () => {
    expect(() => parsePackageIdentifier('lodash')).toThrow(
      "Package identifier 'lodash' is missing a version. Please specify a version (e.g., 'lodash@4.17.21' or '@chakra-ui/react@1.0.0')."
    );
  });

  test('throws error if scoped package version is missing', () => {
    expect(() => parsePackageIdentifier('@chakra-ui/react')).toThrow(
      "Package identifier '@chakra-ui/react' is missing a version. Please specify a version (e.g., 'lodash@4.17.21' or '@chakra-ui/react@1.0.0')."
    );
  });

  test('throws error for invalid package identifier', () => {
    expect(() => parsePackageIdentifier('invalid@identifier/with@extra@symbols')).toThrow(
      "Failed to parse package identifier 'invalid@identifier/with@extra@symbols'. Please specify a version (e.g., 'lodash@4.17.21' or '@chakra-ui/react@1.0.0')."
    );
  });
});