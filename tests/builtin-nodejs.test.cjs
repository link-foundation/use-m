const { describe, test, expect } = require('@jest/globals');
const { use } = require('../use.cjs');
const module = `[${__filename.split('.').pop()} module]`;

describe(`${module} Node.js/Bun-only built-in modules`, () => {
  test(`${module} fs module should work`, async () => {
    const fs = await use('fs');
    
    expect(fs).toBeDefined();
    expect(typeof fs.readFile).toBe('function');
    expect(typeof fs.writeFile).toBe('function');
    expect(typeof fs.readFileSync).toBe('function');
    expect(typeof fs.writeFileSync).toBe('function');
    expect(typeof fs.existsSync).toBe('function');
    expect(typeof fs.mkdirSync).toBe('function');
  });

  test(`${module} path module should work`, async () => {
    const path = await use('path');
    
    expect(path).toBeDefined();
    expect(typeof path.join).toBe('function');
    expect(typeof path.resolve).toBe('function');
    expect(typeof path.dirname).toBe('function');
    expect(typeof path.basename).toBe('function');
    expect(typeof path.extname).toBe('function');
    
    // Test path operations
    expect(path.join('a', 'b', 'c')).toBe('a/b/c');
    expect(path.basename('/path/to/file.txt')).toBe('file.txt');
    expect(path.extname('file.txt')).toBe('.txt');
    expect(path.dirname('/path/to/file.txt')).toBe('/path/to');
  });

  test(`${module} os module should work`, async () => {
    const os = await use('os');
    
    expect(os).toBeDefined();
    expect(typeof os.platform).toBe('function');
    expect(typeof os.arch).toBe('function');
    expect(typeof os.hostname).toBe('function');
    expect(typeof os.tmpdir).toBe('function');
    expect(typeof os.homedir).toBe('function');
    expect(typeof os.cpus).toBe('function');
    
    // Test that functions return expected types
    expect(typeof os.platform()).toBe('string');
    expect(typeof os.arch()).toBe('string');
    expect(typeof os.hostname()).toBe('string');
    expect(typeof os.tmpdir()).toBe('string');
    expect(typeof os.homedir()).toBe('string');
    expect(Array.isArray(os.cpus())).toBe(true);
  });

  test(`${module} util module should work`, async () => {
    const util = await use('util');
    
    expect(util).toBeDefined();
    expect(typeof util.promisify).toBe('function');
    expect(typeof util.inspect).toBe('function');
    expect(typeof util.format).toBe('function');
    expect(typeof util.isDeepStrictEqual).toBe('function');
    
    // Test promisify
    const setTimeout = util.promisify(global.setTimeout);
    expect(typeof setTimeout).toBe('function');
    
    // Test format
    expect(util.format('Hello %s', 'world')).toBe('Hello world');
    
    // Test inspect
    expect(typeof util.inspect({a: 1})).toBe('string');
  });

  test(`${module} events module should work`, async () => {
    const events = await use('events');
    
    expect(events).toBeDefined();
    expect(typeof events.EventEmitter).toBe('function');
    expect(events.EventEmitter).toBe(events.default);
    
    // Test EventEmitter functionality
    const emitter = new events.EventEmitter();
    expect(typeof emitter.on).toBe('function');
    expect(typeof emitter.emit).toBe('function');
    expect(typeof emitter.off).toBe('function');
    
    // Test event emission
    let called = false;
    emitter.on('test', () => { called = true; });
    emitter.emit('test');
    expect(called).toBe(true);
  });

  test(`${module} stream module should work`, async () => {
    const stream = await use('stream');
    
    expect(stream).toBeDefined();
    expect(typeof stream.Stream).toBe('function');
    expect(typeof stream.Readable).toBe('function');
    expect(typeof stream.Writable).toBe('function');
    expect(typeof stream.Transform).toBe('function');
    expect(typeof stream.Duplex).toBe('function');
    expect(stream.Stream).toBe(stream.default);
  });

  test(`${module} buffer module should work`, async () => {
    const buffer = await use('buffer');
    
    expect(buffer).toBeDefined();
    expect(typeof buffer.Buffer).toBe('function');
    expect(buffer.Buffer).toBeDefined();
    
    // Test Buffer functionality
    const buf = buffer.Buffer.from('hello');
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.toString()).toBe('hello');
  });

  test(`${module} process module should work`, async () => {
    const processModule = await use('process');
    
    expect(processModule).toBeDefined();
    expect(processModule.default).toBe(process);
    expect(processModule.pid).toBe(process.pid);
    expect(processModule.platform).toBe(process.platform);
    expect(processModule.version).toBe(process.version);
    expect(Array.isArray(processModule.argv)).toBe(true);
    expect(typeof processModule.env).toBe('object');
  });

  test(`${module} child_process module should work`, async () => {
    const cp = await use('child_process');
    
    expect(cp).toBeDefined();
    expect(typeof cp.exec).toBe('function');
    expect(typeof cp.execSync).toBe('function');
    expect(typeof cp.spawn).toBe('function');
    expect(typeof cp.spawnSync).toBe('function');
    expect(typeof cp.fork).toBe('function');
  });

  test(`${module} http module should work`, async () => {
    const http = await use('http');
    
    expect(http).toBeDefined();
    expect(typeof http.createServer).toBe('function');
    expect(typeof http.request).toBe('function');
    expect(typeof http.get).toBe('function');
    expect(typeof http.Server).toBe('function');
  });

  test(`${module} https module should work`, async () => {
    const https = await use('https');
    
    expect(https).toBeDefined();
    expect(typeof https.createServer).toBe('function');
    expect(typeof https.request).toBe('function');
    expect(typeof https.get).toBe('function');
    expect(typeof https.Server).toBe('function');
  });

  test(`${module} net module should work`, async () => {
    const net = await use('net');
    
    expect(net).toBeDefined();
    expect(typeof net.createServer).toBe('function');
    expect(typeof net.createConnection).toBe('function');
    expect(typeof net.connect).toBe('function');
    expect(typeof net.Socket).toBe('function');
    expect(typeof net.Server).toBe('function');
  });

  test(`${module} dns module should work`, async () => {
    const dns = await use('dns');
    
    expect(dns).toBeDefined();
    expect(typeof dns.lookup).toBe('function');
    expect(typeof dns.resolve).toBe('function');
    expect(typeof dns.reverse).toBe('function');
  });

  test(`${module} zlib module should work`, async () => {
    const zlib = await use('zlib');
    
    expect(zlib).toBeDefined();
    expect(typeof zlib.gzip).toBe('function');
    expect(typeof zlib.gunzip).toBe('function');
    expect(typeof zlib.deflate).toBe('function');
    expect(typeof zlib.inflate).toBe('function');
    expect(typeof zlib.gzipSync).toBe('function');
    expect(typeof zlib.gunzipSync).toBe('function');
  });

  test(`${module} querystring module should work`, async () => {
    const qs = await use('querystring');
    
    expect(qs).toBeDefined();
    expect(typeof qs.parse).toBe('function');
    expect(typeof qs.stringify).toBe('function');
    
    // Test functionality
    const parsed = qs.parse('a=1&b=2');
    expect(parsed.a).toBe('1');
    expect(parsed.b).toBe('2');
    
    const stringified = qs.stringify({a: 1, b: 2});
    expect(stringified).toBe('a=1&b=2');
  });

  test(`${module} assert module should work`, async () => {
    const assert = await use('assert');
    
    expect(assert).toBeDefined();
    expect(typeof assert.default || typeof assert).toBe('function'); // assert is a function
    expect(typeof assert.equal).toBe('function');
    expect(typeof assert.deepEqual).toBe('function');
    expect(typeof assert.strictEqual).toBe('function');
    expect(typeof assert.deepStrictEqual).toBe('function');
    
    // Test that assert works
    const assertFn = assert.default || assert;
    expect(() => assertFn(true)).not.toThrow();
    expect(() => assertFn(false)).toThrow();
  });

  test(`${module} all modules should work with node: prefix`, async () => {
    const fs = await use('node:fs');
    const path = await use('node:path');
    const os = await use('node:os');
    
    expect(fs).toBeDefined();
    expect(typeof fs.readFile).toBe('function');
    
    expect(path).toBeDefined();
    expect(typeof path.join).toBe('function');
    
    expect(os).toBeDefined();
    expect(typeof os.platform).toBe('function');
  });
});