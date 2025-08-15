import { parseModuleSpecifier } from 'use-m';

describe('[MJS Runtime] parseModuleSpecifier', () => {
  test('parses package with name and version', () => {
    const result = parseModuleSpecifier('lodash@4.17.21');
    expect(result).toEqual({
      packageName: 'lodash',
      version: '4.17.21',
      modulePath: '',
    });
  });

  test('parses scoped package with name and version', () => {
    const result = parseModuleSpecifier('@chakra-ui/react@1.0.0');
    expect(result).toEqual({
      packageName: '@chakra-ui/react',
      version: '1.0.0',
      modulePath: '',
    });
  });

  test('parses package with name, version, and inner path', () => {
    const result = parseModuleSpecifier('lodash@4.17.21/path/to/module');
    expect(result).toEqual({
      packageName: 'lodash',
      version: '4.17.21',
      modulePath: '/path/to/module',
    });
  });

  test('parses package with name, version, and inner path', () => {
    const result = parseModuleSpecifier('lodash@latest/path/to/module');
    expect(result).toEqual({
      packageName: 'lodash',
      version: 'latest',
      modulePath: '/path/to/module',
    });
  });

  test('parses scoped package with name, version, and inner path', () => {
    const result = parseModuleSpecifier('@chakra-ui/react@1.0.0/path/to/module');
    expect(result).toEqual({
      packageName: '@chakra-ui/react',
      version: '1.0.0',
      modulePath: '/path/to/module',
    });
  });

  test('parses scoped package with name', () => {
    const result = parseModuleSpecifier('lodash');
    expect(result).toEqual({
      packageName: 'lodash',
      version: 'latest',
      modulePath: '',
    });
  });

  test('parses scoped package with name', () => {
    const result = parseModuleSpecifier('@chakra-ui/react');
    expect(result).toEqual({
      packageName: '@chakra-ui/react',
      version: 'latest',
      modulePath: '',
    });
  });

  test('parses yargs@17.7.2/helpers', () => {
    const result = parseModuleSpecifier('yargs@17.7.2/helpers');
    expect(result).toEqual({
      packageName: 'yargs',
      version: '17.7.2',
      modulePath: '/helpers',
    });
  });

  test('parses yargs@latest/helpers', () => {
    const result = parseModuleSpecifier('yargs@latest/helpers');
    expect(result).toEqual({
      packageName: 'yargs',
      version: 'latest',
      modulePath: '/helpers',
    });
  });

  test('parses yargs/helpers', () => {
    const result = parseModuleSpecifier('yargs/helpers');
    expect(result).toEqual({
      packageName: 'yargs',
      version: 'latest',
      modulePath: '/helpers',
    });
  });

  test('throws error for invalid package identifier', () => {
    expect(() => parseModuleSpecifier('invalid@identifier/with@extra@symbols')).toThrow(
      "Failed to parse package identifier 'invalid@identifier/with@extra@symbols'"
    );
  });
});