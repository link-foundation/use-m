// AUTO-GENERATED — do not edit use.mjs directly.
// This readable, single-file distribution bundle is built deterministically
// from the smaller source fragments in src/use/. Run `npm run build` after
// editing those fragments. The root file remains available for historical
// CDN URLs such as https://unpkg.com/use-m/use.mjs.
/*! Bundled node-semver (ISC):
The ISC License

Copyright (c) Isaac Z. Schlueter and Contributors

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR
IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
*/

var npmSemver = (() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // node_modules/semver/internal/debug.js
  var require_debug = __commonJS({
    "node_modules/semver/internal/debug.js"(exports, module) {
      "use strict";
      var debug = typeof process === "object" && process.env && void 0 ? (...args) => console.error("SEMVER", ...args) : () => {
      };
      module.exports = debug;
    }
  });

  // node_modules/semver/internal/constants.js
  var require_constants = __commonJS({
    "node_modules/semver/internal/constants.js"(exports, module) {
      "use strict";
      var SEMVER_SPEC_VERSION = "2.0.0";
      var MAX_LENGTH = 256;
      var MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER || /* istanbul ignore next */
      9007199254740991;
      var MAX_SAFE_COMPONENT_LENGTH = 16;
      var MAX_SAFE_BUILD_LENGTH = MAX_LENGTH - 6;
      var RELEASE_TYPES = [
        "major",
        "premajor",
        "minor",
        "preminor",
        "patch",
        "prepatch",
        "prerelease"
      ];
      module.exports = {
        MAX_LENGTH,
        MAX_SAFE_COMPONENT_LENGTH,
        MAX_SAFE_BUILD_LENGTH,
        MAX_SAFE_INTEGER,
        RELEASE_TYPES,
        SEMVER_SPEC_VERSION,
        FLAG_INCLUDE_PRERELEASE: 1,
        FLAG_LOOSE: 2
      };
    }
  });

  // node_modules/semver/internal/re.js
  var require_re = __commonJS({
    "node_modules/semver/internal/re.js"(exports, module) {
      "use strict";
      var {
        MAX_SAFE_COMPONENT_LENGTH,
        MAX_SAFE_BUILD_LENGTH,
        MAX_LENGTH
      } = require_constants();
      var debug = require_debug();
      exports = module.exports = {};
      var re = exports.re = [];
      var safeRe = exports.safeRe = [];
      var src = exports.src = [];
      var safeSrc = exports.safeSrc = [];
      var t = exports.t = {};
      var R = 0;
      var LETTERDASHNUMBER = "[a-zA-Z0-9-]";
      var safeRegexReplacements = [
        ["\\s", 1],
        ["\\d", MAX_LENGTH],
        [LETTERDASHNUMBER, MAX_SAFE_BUILD_LENGTH]
      ];
      var makeSafeRegex = (value) => {
        for (const [token, max] of safeRegexReplacements) {
          value = value.split(`${token}*`).join(`${token}{0,${max}}`).split(`${token}+`).join(`${token}{1,${max}}`);
        }
        return value;
      };
      var createToken = (name, value, isGlobal) => {
        const safe = makeSafeRegex(value);
        const index = R++;
        debug(name, index, value);
        t[name] = index;
        src[index] = value;
        safeSrc[index] = safe;
        re[index] = new RegExp(value, isGlobal ? "g" : void 0);
        safeRe[index] = new RegExp(safe, isGlobal ? "g" : void 0);
      };
      createToken("NUMERICIDENTIFIER", "0|[1-9]\\d*");
      createToken("NUMERICIDENTIFIERLOOSE", "\\d+");
      createToken("NONNUMERICIDENTIFIER", `\\d*[a-zA-Z-]${LETTERDASHNUMBER}*`);
      createToken("MAINVERSION", `(${src[t.NUMERICIDENTIFIER]})\\.(${src[t.NUMERICIDENTIFIER]})\\.(${src[t.NUMERICIDENTIFIER]})`);
      createToken("MAINVERSIONLOOSE", `(${src[t.NUMERICIDENTIFIERLOOSE]})\\.(${src[t.NUMERICIDENTIFIERLOOSE]})\\.(${src[t.NUMERICIDENTIFIERLOOSE]})`);
      createToken("PRERELEASEIDENTIFIER", `(?:${src[t.NONNUMERICIDENTIFIER]}|${src[t.NUMERICIDENTIFIER]})`);
      createToken("PRERELEASEIDENTIFIERLOOSE", `(?:${src[t.NONNUMERICIDENTIFIER]}|${src[t.NUMERICIDENTIFIERLOOSE]})`);
      createToken("PRERELEASE", `(?:-(${src[t.PRERELEASEIDENTIFIER]}(?:\\.${src[t.PRERELEASEIDENTIFIER]})*))`);
      createToken("PRERELEASELOOSE", `(?:-?(${src[t.PRERELEASEIDENTIFIERLOOSE]}(?:\\.${src[t.PRERELEASEIDENTIFIERLOOSE]})*))`);
      createToken("BUILDIDENTIFIER", `${LETTERDASHNUMBER}+`);
      createToken("BUILD", `(?:\\+(${src[t.BUILDIDENTIFIER]}(?:\\.${src[t.BUILDIDENTIFIER]})*))`);
      createToken("FULLPLAIN", `v?${src[t.MAINVERSION]}${src[t.PRERELEASE]}?${src[t.BUILD]}?`);
      createToken("FULL", `^${src[t.FULLPLAIN]}$`);
      createToken("LOOSEPLAIN", `[v=\\s]*${src[t.MAINVERSIONLOOSE]}${src[t.PRERELEASELOOSE]}?${src[t.BUILD]}?`);
      createToken("LOOSE", `^${src[t.LOOSEPLAIN]}$`);
      createToken("GTLT", "((?:<|>)?=?)");
      createToken("XRANGEIDENTIFIERLOOSE", `${src[t.NUMERICIDENTIFIERLOOSE]}|x|X|\\*`);
      createToken("XRANGEIDENTIFIER", `${src[t.NUMERICIDENTIFIER]}|x|X|\\*`);
      createToken("XRANGEPLAIN", `[v=\\s]*(${src[t.XRANGEIDENTIFIER]})(?:\\.(${src[t.XRANGEIDENTIFIER]})(?:\\.(${src[t.XRANGEIDENTIFIER]})(?:${src[t.PRERELEASE]})?${src[t.BUILD]}?)?)?`);
      createToken("XRANGEPLAINLOOSE", `[v=\\s]*(${src[t.XRANGEIDENTIFIERLOOSE]})(?:\\.(${src[t.XRANGEIDENTIFIERLOOSE]})(?:\\.(${src[t.XRANGEIDENTIFIERLOOSE]})(?:${src[t.PRERELEASELOOSE]})?${src[t.BUILD]}?)?)?`);
      createToken("XRANGE", `^${src[t.GTLT]}\\s*${src[t.XRANGEPLAIN]}$`);
      createToken("XRANGELOOSE", `^${src[t.GTLT]}\\s*${src[t.XRANGEPLAINLOOSE]}$`);
      createToken("COERCEPLAIN", `${"(^|[^\\d])(\\d{1,"}${MAX_SAFE_COMPONENT_LENGTH}})(?:\\.(\\d{1,${MAX_SAFE_COMPONENT_LENGTH}}))?(?:\\.(\\d{1,${MAX_SAFE_COMPONENT_LENGTH}}))?`);
      createToken("COERCE", `${src[t.COERCEPLAIN]}(?:$|[^\\d])`);
      createToken("COERCEFULL", src[t.COERCEPLAIN] + `(?:${src[t.PRERELEASE]})?(?:${src[t.BUILD]})?(?:$|[^\\d])`);
      createToken("COERCERTL", src[t.COERCE], true);
      createToken("COERCERTLFULL", src[t.COERCEFULL], true);
      createToken("LONETILDE", "(?:~>?)");
      createToken("TILDETRIM", `(\\s*)${src[t.LONETILDE]}\\s+`, true);
      exports.tildeTrimReplace = "$1~";
      createToken("TILDE", `^${src[t.LONETILDE]}${src[t.XRANGEPLAIN]}$`);
      createToken("TILDELOOSE", `^${src[t.LONETILDE]}${src[t.XRANGEPLAINLOOSE]}$`);
      createToken("LONECARET", "(?:\\^)");
      createToken("CARETTRIM", `(\\s*)${src[t.LONECARET]}\\s+`, true);
      exports.caretTrimReplace = "$1^";
      createToken("CARET", `^${src[t.LONECARET]}${src[t.XRANGEPLAIN]}$`);
      createToken("CARETLOOSE", `^${src[t.LONECARET]}${src[t.XRANGEPLAINLOOSE]}$`);
      createToken("COMPARATORLOOSE", `^${src[t.GTLT]}\\s*(${src[t.LOOSEPLAIN]})$|^$`);
      createToken("COMPARATOR", `^${src[t.GTLT]}\\s*(${src[t.FULLPLAIN]})$|^$`);
      createToken("COMPARATORTRIM", `(\\s*)${src[t.GTLT]}\\s*(${src[t.LOOSEPLAIN]}|${src[t.XRANGEPLAIN]})`, true);
      exports.comparatorTrimReplace = "$1$2$3";
      createToken("HYPHENRANGE", `^\\s*(${src[t.XRANGEPLAIN]})\\s+-\\s+(${src[t.XRANGEPLAIN]})\\s*$`);
      createToken("HYPHENRANGELOOSE", `^\\s*(${src[t.XRANGEPLAINLOOSE]})\\s+-\\s+(${src[t.XRANGEPLAINLOOSE]})\\s*$`);
      createToken("STAR", "(<|>)?=?\\s*\\*");
      createToken("GTE0", "^\\s*>=\\s*0\\.0\\.0\\s*$");
      createToken("GTE0PRE", "^\\s*>=\\s*0\\.0\\.0-0\\s*$");
    }
  });

  // node_modules/semver/internal/parse-options.js
  var require_parse_options = __commonJS({
    "node_modules/semver/internal/parse-options.js"(exports, module) {
      "use strict";
      var looseOption = Object.freeze({ loose: true });
      var emptyOpts = Object.freeze({});
      var parseOptions = (options) => {
        if (!options) {
          return emptyOpts;
        }
        if (typeof options !== "object") {
          return looseOption;
        }
        return options;
      };
      module.exports = parseOptions;
    }
  });

  // node_modules/semver/internal/identifiers.js
  var require_identifiers = __commonJS({
    "node_modules/semver/internal/identifiers.js"(exports, module) {
      "use strict";
      var numeric = /^[0-9]+$/;
      var compareIdentifiers = (a, b) => {
        if (typeof a === "number" && typeof b === "number") {
          return a === b ? 0 : a < b ? -1 : 1;
        }
        const anum = numeric.test(a);
        const bnum = numeric.test(b);
        if (anum && bnum) {
          a = +a;
          b = +b;
        }
        return a === b ? 0 : anum && !bnum ? -1 : bnum && !anum ? 1 : a < b ? -1 : 1;
      };
      var rcompareIdentifiers = (a, b) => compareIdentifiers(b, a);
      module.exports = {
        compareIdentifiers,
        rcompareIdentifiers
      };
    }
  });

  // node_modules/semver/classes/semver.js
  var require_semver = __commonJS({
    "node_modules/semver/classes/semver.js"(exports, module) {
      "use strict";
      var debug = require_debug();
      var { MAX_LENGTH, MAX_SAFE_INTEGER } = require_constants();
      var { safeRe: re, t } = require_re();
      var parseOptions = require_parse_options();
      var { compareIdentifiers } = require_identifiers();
      var isPrereleaseIdentifier = (prerelease, identifier) => {
        const identifiers = identifier.split(".");
        if (identifiers.length > prerelease.length) {
          return false;
        }
        for (let i = 0; i < identifiers.length; i++) {
          if (compareIdentifiers(prerelease[i], identifiers[i]) !== 0) {
            return false;
          }
        }
        return true;
      };
      var SemVer = class _SemVer {
        constructor(version, options) {
          options = parseOptions(options);
          if (version instanceof _SemVer) {
            if (version.loose === !!options.loose && version.includePrerelease === !!options.includePrerelease) {
              return version;
            } else {
              version = version.version;
            }
          } else if (typeof version !== "string") {
            throw new TypeError(`Invalid version. Must be a string. Got type "${typeof version}".`);
          }
          if (version.length > MAX_LENGTH) {
            throw new TypeError(
              `version is longer than ${MAX_LENGTH} characters`
            );
          }
          debug("SemVer", version, options);
          this.options = options;
          this.loose = !!options.loose;
          this.includePrerelease = !!options.includePrerelease;
          const m = version.trim().match(options.loose ? re[t.LOOSE] : re[t.FULL]);
          if (!m) {
            throw new TypeError(`Invalid Version: ${version}`);
          }
          this.raw = version;
          this.major = +m[1];
          this.minor = +m[2];
          this.patch = +m[3];
          if (this.major > MAX_SAFE_INTEGER || this.major < 0) {
            throw new TypeError("Invalid major version");
          }
          if (this.minor > MAX_SAFE_INTEGER || this.minor < 0) {
            throw new TypeError("Invalid minor version");
          }
          if (this.patch > MAX_SAFE_INTEGER || this.patch < 0) {
            throw new TypeError("Invalid patch version");
          }
          if (!m[4]) {
            this.prerelease = [];
          } else {
            this.prerelease = m[4].split(".").map((id) => {
              if (/^[0-9]+$/.test(id)) {
                const num = +id;
                if (num >= 0 && num < MAX_SAFE_INTEGER) {
                  return num;
                }
              }
              return id;
            });
          }
          this.build = m[5] ? m[5].split(".") : [];
          this.format();
        }
        format() {
          this.version = `${this.major}.${this.minor}.${this.patch}`;
          if (this.prerelease.length) {
            this.version += `-${this.prerelease.join(".")}`;
          }
          return this.version;
        }
        toString() {
          return this.version;
        }
        compare(other) {
          debug("SemVer.compare", this.version, this.options, other);
          if (!(other instanceof _SemVer)) {
            if (typeof other === "string" && other === this.version) {
              return 0;
            }
            other = new _SemVer(other, this.options);
          }
          if (other.version === this.version) {
            return 0;
          }
          return this.compareMain(other) || this.comparePre(other);
        }
        compareMain(other) {
          if (!(other instanceof _SemVer)) {
            other = new _SemVer(other, this.options);
          }
          if (this.major < other.major) {
            return -1;
          }
          if (this.major > other.major) {
            return 1;
          }
          if (this.minor < other.minor) {
            return -1;
          }
          if (this.minor > other.minor) {
            return 1;
          }
          if (this.patch < other.patch) {
            return -1;
          }
          if (this.patch > other.patch) {
            return 1;
          }
          return 0;
        }
        comparePre(other) {
          if (!(other instanceof _SemVer)) {
            other = new _SemVer(other, this.options);
          }
          if (this.prerelease.length && !other.prerelease.length) {
            return -1;
          } else if (!this.prerelease.length && other.prerelease.length) {
            return 1;
          } else if (!this.prerelease.length && !other.prerelease.length) {
            return 0;
          }
          let i = 0;
          do {
            const a = this.prerelease[i];
            const b = other.prerelease[i];
            debug("prerelease compare", i, a, b);
            if (a === void 0 && b === void 0) {
              return 0;
            } else if (b === void 0) {
              return 1;
            } else if (a === void 0) {
              return -1;
            } else if (a === b) {
              continue;
            } else {
              return compareIdentifiers(a, b);
            }
          } while (++i);
        }
        compareBuild(other) {
          if (!(other instanceof _SemVer)) {
            other = new _SemVer(other, this.options);
          }
          let i = 0;
          do {
            const a = this.build[i];
            const b = other.build[i];
            debug("build compare", i, a, b);
            if (a === void 0 && b === void 0) {
              return 0;
            } else if (b === void 0) {
              return 1;
            } else if (a === void 0) {
              return -1;
            } else if (a === b) {
              continue;
            } else {
              return compareIdentifiers(a, b);
            }
          } while (++i);
        }
        // preminor will bump the version up to the next minor release, and immediately
        // down to pre-release. premajor and prepatch work the same way.
        inc(release, identifier, identifierBase) {
          if (release.startsWith("pre")) {
            if (!identifier && identifierBase === false) {
              throw new Error("invalid increment argument: identifier is empty");
            }
            if (identifier) {
              const match = `-${identifier}`.match(this.options.loose ? re[t.PRERELEASELOOSE] : re[t.PRERELEASE]);
              if (!match || match[1] !== identifier) {
                throw new Error(`invalid identifier: ${identifier}`);
              }
            }
          }
          switch (release) {
            case "premajor":
              this.prerelease.length = 0;
              this.patch = 0;
              this.minor = 0;
              this.major++;
              this.inc("pre", identifier, identifierBase);
              break;
            case "preminor":
              this.prerelease.length = 0;
              this.patch = 0;
              this.minor++;
              this.inc("pre", identifier, identifierBase);
              break;
            case "prepatch":
              this.prerelease.length = 0;
              this.inc("patch", identifier, identifierBase);
              this.inc("pre", identifier, identifierBase);
              break;
            // If the input is a non-prerelease version, this acts the same as
            // prepatch.
            case "prerelease":
              if (this.prerelease.length === 0) {
                this.inc("patch", identifier, identifierBase);
              }
              this.inc("pre", identifier, identifierBase);
              break;
            case "release":
              if (this.prerelease.length === 0) {
                throw new Error(`version ${this.raw} is not a prerelease`);
              }
              this.prerelease.length = 0;
              break;
            case "major":
              if (this.minor !== 0 || this.patch !== 0 || this.prerelease.length === 0) {
                this.major++;
              }
              this.minor = 0;
              this.patch = 0;
              this.prerelease = [];
              break;
            case "minor":
              if (this.patch !== 0 || this.prerelease.length === 0) {
                this.minor++;
              }
              this.patch = 0;
              this.prerelease = [];
              break;
            case "patch":
              if (this.prerelease.length === 0) {
                this.patch++;
              }
              this.prerelease = [];
              break;
            // This probably shouldn't be used publicly.
            // 1.0.0 'pre' would become 1.0.0-0 which is the wrong direction.
            case "pre": {
              const base = Number(identifierBase) ? 1 : 0;
              if (this.prerelease.length === 0) {
                this.prerelease = [base];
              } else {
                let i = this.prerelease.length;
                while (--i >= 0) {
                  if (typeof this.prerelease[i] === "number") {
                    this.prerelease[i]++;
                    i = -2;
                  }
                }
                if (i === -1) {
                  if (identifier === this.prerelease.join(".") && identifierBase === false) {
                    throw new Error("invalid increment argument: identifier already exists");
                  }
                  this.prerelease.push(base);
                }
              }
              if (identifier) {
                let prerelease = [identifier, base];
                if (identifierBase === false) {
                  prerelease = [identifier];
                }
                if (isPrereleaseIdentifier(this.prerelease, identifier)) {
                  const prereleaseBase = this.prerelease[identifier.split(".").length];
                  if (isNaN(prereleaseBase)) {
                    this.prerelease = prerelease;
                  }
                } else {
                  this.prerelease = prerelease;
                }
              }
              break;
            }
            default:
              throw new Error(`invalid increment argument: ${release}`);
          }
          this.raw = this.format();
          if (this.build.length) {
            this.raw += `+${this.build.join(".")}`;
          }
          return this;
        }
      };
      module.exports = SemVer;
    }
  });

  // node_modules/semver/functions/parse.js
  var require_parse = __commonJS({
    "node_modules/semver/functions/parse.js"(exports, module) {
      "use strict";
      var SemVer = require_semver();
      var parse = (version, options, throwErrors = false) => {
        if (version instanceof SemVer) {
          return version;
        }
        try {
          return new SemVer(version, options);
        } catch (er) {
          if (!throwErrors) {
            return null;
          }
          throw er;
        }
      };
      module.exports = parse;
    }
  });

  // node_modules/semver/functions/valid.js
  var require_valid = __commonJS({
    "node_modules/semver/functions/valid.js"(exports, module) {
      "use strict";
      var parse = require_parse();
      var valid = (version, options) => {
        const v = parse(version, options);
        return v ? v.version : null;
      };
      module.exports = valid;
    }
  });

  // node_modules/semver/internal/lrucache.js
  var require_lrucache = __commonJS({
    "node_modules/semver/internal/lrucache.js"(exports, module) {
      "use strict";
      var LRUCache = class {
        constructor() {
          this.max = 1e3;
          this.map = /* @__PURE__ */ new Map();
        }
        get(key) {
          const value = this.map.get(key);
          if (value === void 0) {
            return void 0;
          } else {
            this.map.delete(key);
            this.map.set(key, value);
            return value;
          }
        }
        delete(key) {
          return this.map.delete(key);
        }
        set(key, value) {
          const deleted = this.delete(key);
          if (!deleted && value !== void 0) {
            if (this.map.size >= this.max) {
              const firstKey = this.map.keys().next().value;
              this.delete(firstKey);
            }
            this.map.set(key, value);
          }
          return this;
        }
      };
      module.exports = LRUCache;
    }
  });

  // node_modules/semver/functions/compare.js
  var require_compare = __commonJS({
    "node_modules/semver/functions/compare.js"(exports, module) {
      "use strict";
      var SemVer = require_semver();
      var compare = (a, b, loose) => new SemVer(a, loose).compare(new SemVer(b, loose));
      module.exports = compare;
    }
  });

  // node_modules/semver/functions/eq.js
  var require_eq = __commonJS({
    "node_modules/semver/functions/eq.js"(exports, module) {
      "use strict";
      var compare = require_compare();
      var eq = (a, b, loose) => compare(a, b, loose) === 0;
      module.exports = eq;
    }
  });

  // node_modules/semver/functions/neq.js
  var require_neq = __commonJS({
    "node_modules/semver/functions/neq.js"(exports, module) {
      "use strict";
      var compare = require_compare();
      var neq = (a, b, loose) => compare(a, b, loose) !== 0;
      module.exports = neq;
    }
  });

  // node_modules/semver/functions/gt.js
  var require_gt = __commonJS({
    "node_modules/semver/functions/gt.js"(exports, module) {
      "use strict";
      var compare = require_compare();
      var gt = (a, b, loose) => compare(a, b, loose) > 0;
      module.exports = gt;
    }
  });

  // node_modules/semver/functions/gte.js
  var require_gte = __commonJS({
    "node_modules/semver/functions/gte.js"(exports, module) {
      "use strict";
      var compare = require_compare();
      var gte = (a, b, loose) => compare(a, b, loose) >= 0;
      module.exports = gte;
    }
  });

  // node_modules/semver/functions/lt.js
  var require_lt = __commonJS({
    "node_modules/semver/functions/lt.js"(exports, module) {
      "use strict";
      var compare = require_compare();
      var lt = (a, b, loose) => compare(a, b, loose) < 0;
      module.exports = lt;
    }
  });

  // node_modules/semver/functions/lte.js
  var require_lte = __commonJS({
    "node_modules/semver/functions/lte.js"(exports, module) {
      "use strict";
      var compare = require_compare();
      var lte = (a, b, loose) => compare(a, b, loose) <= 0;
      module.exports = lte;
    }
  });

  // node_modules/semver/functions/cmp.js
  var require_cmp = __commonJS({
    "node_modules/semver/functions/cmp.js"(exports, module) {
      "use strict";
      var eq = require_eq();
      var neq = require_neq();
      var gt = require_gt();
      var gte = require_gte();
      var lt = require_lt();
      var lte = require_lte();
      var cmp = (a, op, b, loose) => {
        switch (op) {
          case "===":
            if (typeof a === "object") {
              a = a.version;
            }
            if (typeof b === "object") {
              b = b.version;
            }
            return a === b;
          case "!==":
            if (typeof a === "object") {
              a = a.version;
            }
            if (typeof b === "object") {
              b = b.version;
            }
            return a !== b;
          case "":
          case "=":
          case "==":
            return eq(a, b, loose);
          case "!=":
            return neq(a, b, loose);
          case ">":
            return gt(a, b, loose);
          case ">=":
            return gte(a, b, loose);
          case "<":
            return lt(a, b, loose);
          case "<=":
            return lte(a, b, loose);
          default:
            throw new TypeError(`Invalid operator: ${op}`);
        }
      };
      module.exports = cmp;
    }
  });

  // node_modules/semver/classes/comparator.js
  var require_comparator = __commonJS({
    "node_modules/semver/classes/comparator.js"(exports, module) {
      "use strict";
      var ANY = Symbol("SemVer ANY");
      var Comparator = class _Comparator {
        static get ANY() {
          return ANY;
        }
        constructor(comp, options) {
          options = parseOptions(options);
          if (comp instanceof _Comparator) {
            if (comp.loose === !!options.loose) {
              return comp;
            } else {
              comp = comp.value;
            }
          }
          comp = comp.trim().split(/\s+/).join(" ");
          debug("comparator", comp, options);
          this.options = options;
          this.loose = !!options.loose;
          this.parse(comp);
          if (this.semver === ANY) {
            this.value = "";
          } else {
            this.value = this.operator + this.semver.version;
          }
          debug("comp", this);
        }
        parse(comp) {
          const r = this.options.loose ? re[t.COMPARATORLOOSE] : re[t.COMPARATOR];
          const m = comp.match(r);
          if (!m) {
            throw new TypeError(`Invalid comparator: ${comp}`);
          }
          this.operator = m[1] !== void 0 ? m[1] : "";
          if (this.operator === "=") {
            this.operator = "";
          }
          if (!m[2]) {
            this.semver = ANY;
          } else {
            this.semver = new SemVer(m[2], this.options.loose);
          }
        }
        toString() {
          return this.value;
        }
        test(version) {
          debug("Comparator.test", version, this.options.loose);
          if (this.semver === ANY || version === ANY) {
            return true;
          }
          if (typeof version === "string") {
            try {
              version = new SemVer(version, this.options);
            } catch (er) {
              return false;
            }
          }
          return cmp(version, this.operator, this.semver, this.options);
        }
        intersects(comp, options) {
          if (!(comp instanceof _Comparator)) {
            throw new TypeError("a Comparator is required");
          }
          if (this.operator === "") {
            if (this.value === "") {
              return true;
            }
            return new Range(comp.value, options).test(this.value);
          } else if (comp.operator === "") {
            if (comp.value === "") {
              return true;
            }
            return new Range(this.value, options).test(comp.semver);
          }
          options = parseOptions(options);
          if (options.includePrerelease && (this.value === "<0.0.0-0" || comp.value === "<0.0.0-0")) {
            return false;
          }
          if (!options.includePrerelease && (this.value.startsWith("<0.0.0") || comp.value.startsWith("<0.0.0"))) {
            return false;
          }
          if (this.operator.startsWith(">") && comp.operator.startsWith(">")) {
            return true;
          }
          if (this.operator.startsWith("<") && comp.operator.startsWith("<")) {
            return true;
          }
          if (this.semver.version === comp.semver.version && this.operator.includes("=") && comp.operator.includes("=")) {
            return true;
          }
          if (cmp(this.semver, "<", comp.semver, options) && this.operator.startsWith(">") && comp.operator.startsWith("<")) {
            return true;
          }
          if (cmp(this.semver, ">", comp.semver, options) && this.operator.startsWith("<") && comp.operator.startsWith(">")) {
            return true;
          }
          return false;
        }
      };
      module.exports = Comparator;
      var parseOptions = require_parse_options();
      var { safeRe: re, t } = require_re();
      var cmp = require_cmp();
      var debug = require_debug();
      var SemVer = require_semver();
      var Range = require_range();
    }
  });

  // node_modules/semver/classes/range.js
  var require_range = __commonJS({
    "node_modules/semver/classes/range.js"(exports, module) {
      "use strict";
      var SPACE_CHARACTERS = /\s+/g;
      var Range = class _Range {
        constructor(range, options) {
          options = parseOptions(options);
          if (range instanceof _Range) {
            if (range.loose === !!options.loose && range.includePrerelease === !!options.includePrerelease) {
              return range;
            } else {
              return new _Range(range.raw, options);
            }
          }
          if (range instanceof Comparator) {
            this.raw = range.value;
            this.set = [[range]];
            this.formatted = void 0;
            return this;
          }
          this.options = options;
          this.loose = !!options.loose;
          this.includePrerelease = !!options.includePrerelease;
          this.raw = range.trim().replace(SPACE_CHARACTERS, " ");
          this.set = this.raw.split("||").map((r) => this.parseRange(r.trim())).filter((c) => c.length);
          if (!this.set.length) {
            throw new TypeError(`Invalid SemVer Range: ${this.raw}`);
          }
          if (this.set.length > 1) {
            const first = this.set[0];
            this.set = this.set.filter((c) => !isNullSet(c[0]));
            if (this.set.length === 0) {
              this.set = [first];
            } else if (this.set.length > 1) {
              for (const c of this.set) {
                if (c.length === 1 && isAny(c[0])) {
                  this.set = [c];
                  break;
                }
              }
            }
          }
          this.formatted = void 0;
        }
        get range() {
          if (this.formatted === void 0) {
            this.formatted = "";
            for (let i = 0; i < this.set.length; i++) {
              if (i > 0) {
                this.formatted += "||";
              }
              const comps = this.set[i];
              for (let k = 0; k < comps.length; k++) {
                if (k > 0) {
                  this.formatted += " ";
                }
                this.formatted += comps[k].toString().trim();
              }
            }
          }
          return this.formatted;
        }
        format() {
          return this.range;
        }
        toString() {
          return this.range;
        }
        parseRange(range) {
          range = range.replace(BUILDSTRIPRE, "");
          const memoOpts = (this.options.includePrerelease && FLAG_INCLUDE_PRERELEASE) | (this.options.loose && FLAG_LOOSE);
          const memoKey = memoOpts + ":" + range;
          const cached = cache.get(memoKey);
          if (cached) {
            return cached;
          }
          const loose = this.options.loose;
          const hr = loose ? re[t.HYPHENRANGELOOSE] : re[t.HYPHENRANGE];
          range = range.replace(hr, hyphenReplace(this.options.includePrerelease));
          debug("hyphen replace", range);
          range = range.replace(re[t.COMPARATORTRIM], comparatorTrimReplace);
          debug("comparator trim", range);
          range = range.replace(re[t.TILDETRIM], tildeTrimReplace);
          debug("tilde trim", range);
          range = range.replace(re[t.CARETTRIM], caretTrimReplace);
          debug("caret trim", range);
          let rangeList = range.split(" ").map((comp) => parseComparator(comp, this.options)).join(" ").split(/\s+/).map((comp) => replaceGTE0(comp, this.options));
          if (loose) {
            rangeList = rangeList.filter((comp) => {
              debug("loose invalid filter", comp, this.options);
              return !!comp.match(re[t.COMPARATORLOOSE]);
            });
          }
          debug("range list", rangeList);
          const rangeMap = /* @__PURE__ */ new Map();
          const comparators = rangeList.map((comp) => new Comparator(comp, this.options));
          for (const comp of comparators) {
            if (isNullSet(comp)) {
              return [comp];
            }
            rangeMap.set(comp.value, comp);
          }
          if (rangeMap.size > 1 && rangeMap.has("")) {
            rangeMap.delete("");
          }
          const result = [...rangeMap.values()];
          cache.set(memoKey, result);
          return result;
        }
        intersects(range, options) {
          if (!(range instanceof _Range)) {
            throw new TypeError("a Range is required");
          }
          return this.set.some((thisComparators) => {
            return isSatisfiable(thisComparators, options) && range.set.some((rangeComparators) => {
              return isSatisfiable(rangeComparators, options) && thisComparators.every((thisComparator) => {
                return rangeComparators.every((rangeComparator) => {
                  return thisComparator.intersects(rangeComparator, options);
                });
              });
            });
          });
        }
        // if ANY of the sets match ALL of its comparators, then pass
        test(version) {
          if (!version) {
            return false;
          }
          if (typeof version === "string") {
            try {
              version = new SemVer(version, this.options);
            } catch (er) {
              return false;
            }
          }
          for (let i = 0; i < this.set.length; i++) {
            if (testSet(this.set[i], version, this.options)) {
              return true;
            }
          }
          return false;
        }
      };
      module.exports = Range;
      var LRU = require_lrucache();
      var cache = new LRU();
      var parseOptions = require_parse_options();
      var Comparator = require_comparator();
      var debug = require_debug();
      var SemVer = require_semver();
      var {
        safeRe: re,
        src,
        t,
        comparatorTrimReplace,
        tildeTrimReplace,
        caretTrimReplace
      } = require_re();
      var { FLAG_INCLUDE_PRERELEASE, FLAG_LOOSE } = require_constants();
      var BUILDSTRIPRE = new RegExp(src[t.BUILD], "g");
      var isNullSet = (c) => c.value === "<0.0.0-0";
      var isAny = (c) => c.value === "";
      var isSatisfiable = (comparators, options) => {
        let result = true;
        const remainingComparators = comparators.slice();
        let testComparator = remainingComparators.pop();
        while (result && remainingComparators.length) {
          result = remainingComparators.every((otherComparator) => {
            return testComparator.intersects(otherComparator, options);
          });
          testComparator = remainingComparators.pop();
        }
        return result;
      };
      var parseComparator = (comp, options) => {
        comp = comp.replace(re[t.BUILD], "");
        debug("comp", comp, options);
        comp = replaceCarets(comp, options);
        debug("caret", comp);
        comp = replaceTildes(comp, options);
        debug("tildes", comp);
        comp = replaceXRanges(comp, options);
        debug("xrange", comp);
        comp = replaceStars(comp, options);
        debug("stars", comp);
        return comp;
      };
      var isX = (id) => !id || id.toLowerCase() === "x" || id === "*";
      var invalidXRangeOrder = (M, m, p) => isX(M) && !isX(m) || isX(m) && p && !isX(p);
      var replaceTildes = (comp, options) => {
        return comp.trim().split(/\s+/).map((c) => replaceTilde(c, options)).join(" ");
      };
      var replaceTilde = (comp, options) => {
        const r = options.loose ? re[t.TILDELOOSE] : re[t.TILDE];
        const z = options.includePrerelease ? "-0" : "";
        return comp.replace(r, (_, M, m, p, pr) => {
          debug("tilde", comp, _, M, m, p, pr);
          let ret;
          if (isX(M)) {
            ret = "";
          } else if (isX(m)) {
            ret = `>=${M}.0.0${z} <${+M + 1}.0.0-0`;
          } else if (isX(p)) {
            ret = `>=${M}.${m}.0${z} <${M}.${+m + 1}.0-0`;
          } else if (pr) {
            debug("replaceTilde pr", pr);
            ret = `>=${M}.${m}.${p}-${pr} <${M}.${+m + 1}.0-0`;
          } else {
            ret = `>=${M}.${m}.${p} <${M}.${+m + 1}.0-0`;
          }
          debug("tilde return", ret);
          return ret;
        });
      };
      var replaceCarets = (comp, options) => {
        return comp.trim().split(/\s+/).map((c) => replaceCaret(c, options)).join(" ");
      };
      var replaceCaret = (comp, options) => {
        debug("caret", comp, options);
        const r = options.loose ? re[t.CARETLOOSE] : re[t.CARET];
        const z = options.includePrerelease ? "-0" : "";
        return comp.replace(r, (_, M, m, p, pr) => {
          debug("caret", comp, _, M, m, p, pr);
          let ret;
          if (isX(M)) {
            ret = "";
          } else if (isX(m)) {
            ret = `>=${M}.0.0${z} <${+M + 1}.0.0-0`;
          } else if (isX(p)) {
            if (M === "0") {
              ret = `>=${M}.${m}.0${z} <${M}.${+m + 1}.0-0`;
            } else {
              ret = `>=${M}.${m}.0${z} <${+M + 1}.0.0-0`;
            }
          } else if (pr) {
            debug("replaceCaret pr", pr);
            if (M === "0") {
              if (m === "0") {
                ret = `>=${M}.${m}.${p}-${pr} <${M}.${m}.${+p + 1}-0`;
              } else {
                ret = `>=${M}.${m}.${p}-${pr} <${M}.${+m + 1}.0-0`;
              }
            } else {
              ret = `>=${M}.${m}.${p}-${pr} <${+M + 1}.0.0-0`;
            }
          } else {
            debug("no pr");
            if (M === "0") {
              if (m === "0") {
                ret = `>=${M}.${m}.${p} <${M}.${m}.${+p + 1}-0`;
              } else {
                ret = `>=${M}.${m}.${p} <${M}.${+m + 1}.0-0`;
              }
            } else {
              ret = `>=${M}.${m}.${p} <${+M + 1}.0.0-0`;
            }
          }
          debug("caret return", ret);
          return ret;
        });
      };
      var replaceXRanges = (comp, options) => {
        debug("replaceXRanges", comp, options);
        return comp.split(/\s+/).map((c) => replaceXRange(c, options)).join(" ");
      };
      var replaceXRange = (comp, options) => {
        comp = comp.trim();
        const r = options.loose ? re[t.XRANGELOOSE] : re[t.XRANGE];
        return comp.replace(r, (ret, gtlt, M, m, p, pr) => {
          debug("xRange", comp, ret, gtlt, M, m, p, pr);
          if (invalidXRangeOrder(M, m, p)) {
            return comp;
          }
          const xM = isX(M);
          const xm = xM || isX(m);
          const xp = xm || isX(p);
          const anyX = xp;
          if (gtlt === "=" && anyX) {
            gtlt = "";
          }
          pr = options.includePrerelease ? "-0" : "";
          if (xM) {
            if (gtlt === ">" || gtlt === "<") {
              ret = "<0.0.0-0";
            } else {
              ret = "*";
            }
          } else if (gtlt && anyX) {
            if (xm) {
              m = 0;
            }
            p = 0;
            if (gtlt === ">") {
              gtlt = ">=";
              if (xm) {
                M = +M + 1;
                m = 0;
                p = 0;
              } else {
                m = +m + 1;
                p = 0;
              }
            } else if (gtlt === "<=") {
              gtlt = "<";
              if (xm) {
                M = +M + 1;
              } else {
                m = +m + 1;
              }
            }
            if (gtlt === "<") {
              pr = "-0";
            }
            ret = `${gtlt + M}.${m}.${p}${pr}`;
          } else if (xm) {
            ret = `>=${M}.0.0${pr} <${+M + 1}.0.0-0`;
          } else if (xp) {
            ret = `>=${M}.${m}.0${pr} <${M}.${+m + 1}.0-0`;
          }
          debug("xRange return", ret);
          return ret;
        });
      };
      var replaceStars = (comp, options) => {
        debug("replaceStars", comp, options);
        return comp.trim().replace(re[t.STAR], "");
      };
      var replaceGTE0 = (comp, options) => {
        debug("replaceGTE0", comp, options);
        return comp.trim().replace(re[options.includePrerelease ? t.GTE0PRE : t.GTE0], "");
      };
      var hyphenReplace = (incPr) => ($0, from, fM, fm, fp, fpr, fb, to, tM, tm, tp, tpr) => {
        if (isX(fM)) {
          from = "";
        } else if (isX(fm)) {
          from = `>=${fM}.0.0${incPr ? "-0" : ""}`;
        } else if (isX(fp)) {
          from = `>=${fM}.${fm}.0${incPr ? "-0" : ""}`;
        } else if (fpr) {
          from = `>=${from}`;
        } else {
          from = `>=${from}${incPr ? "-0" : ""}`;
        }
        if (isX(tM)) {
          to = "";
        } else if (isX(tm)) {
          to = `<${+tM + 1}.0.0-0`;
        } else if (isX(tp)) {
          to = `<${tM}.${+tm + 1}.0-0`;
        } else if (tpr) {
          to = `<=${tM}.${tm}.${tp}-${tpr}`;
        } else if (incPr) {
          to = `<${tM}.${tm}.${+tp + 1}-0`;
        } else {
          to = `<=${to}`;
        }
        return `${from} ${to}`.trim();
      };
      var testSet = (set, version, options) => {
        for (let i = 0; i < set.length; i++) {
          if (!set[i].test(version)) {
            return false;
          }
        }
        if (version.prerelease.length && !options.includePrerelease) {
          for (let i = 0; i < set.length; i++) {
            debug(set[i].semver);
            if (set[i].semver === Comparator.ANY) {
              continue;
            }
            if (set[i].semver.prerelease.length > 0) {
              const allowed = set[i].semver;
              if (allowed.major === version.major && allowed.minor === version.minor && allowed.patch === version.patch) {
                return true;
              }
            }
          }
          return false;
        }
        return true;
      };
    }
  });

  // node_modules/semver/functions/satisfies.js
  var require_satisfies = __commonJS({
    "node_modules/semver/functions/satisfies.js"(exports, module) {
      "use strict";
      var Range = require_range();
      var satisfies = (version, range, options) => {
        try {
          range = new Range(range, options);
        } catch (er) {
          return false;
        }
        return range.test(version);
      };
      module.exports = satisfies;
    }
  });

  // node_modules/semver/ranges/valid.js
  var require_valid2 = __commonJS({
    "node_modules/semver/ranges/valid.js"(exports, module) {
      "use strict";
      var Range = require_range();
      var validRange = (range, options) => {
        try {
          return new Range(range, options).range || "*";
        } catch (er) {
          return null;
        }
      };
      module.exports = validRange;
    }
  });

  // node_modules/semver/functions/rcompare.js
  var require_rcompare = __commonJS({
    "node_modules/semver/functions/rcompare.js"(exports, module) {
      "use strict";
      var compare = require_compare();
      var rcompare = (a, b, loose) => compare(b, a, loose);
      module.exports = rcompare;
    }
  });

  // <stdin>
  var stdin_exports = {};
  __export(stdin_exports, {
    rcompare: () => import_rcompare.default,
    satisfies: () => import_satisfies.default,
    valid: () => import_valid.default,
    validRange: () => import_valid2.default
  });
  var import_valid = __toESM(require_valid());
  var import_satisfies = __toESM(require_satisfies());
  var import_valid2 = __toESM(require_valid2());
  var import_rcompare = __toESM(require_rcompare());
  return __toCommonJS(stdin_exports);
})();

// Source fragment: caller context, specifier parsing, and built-in helpers.
// Generated bundles concatenate this file; do not import it directly.

const nativeWindowsPathToFileUrl = (filePath) => {
  if (typeof filePath !== 'string') return filePath;

  const drivePath = filePath.match(/^([A-Za-z]):[\\/](.*)$/s);
  if (drivePath) {
    const pathname = drivePath[2]
      .split(/[\\/]/)
      .map(segment => encodeURIComponent(segment))
      .join('/');
    return `file:///${drivePath[1].toUpperCase()}:/${pathname}`;
  }

  const uncPath = filePath.match(/^\\\\([^\\/]+)[\\/](.*)$/s);
  if (uncPath) {
    const pathname = uncPath[2]
      .split(/[\\/]/)
      .map(segment => encodeURIComponent(segment))
      .join('/');
    return `file://${uncPath[1]}/${pathname}`;
  }

  return filePath;
};

const absolutePathToFileUrl = (filePath) => {
  const windowsUrl = nativeWindowsPathToFileUrl(filePath);
  if (windowsUrl !== filePath) return windowsUrl;
  return typeof filePath === 'string' && filePath.startsWith('/')
    ? `file://${filePath}`
    : filePath;
};

const extractCallerContext = (stack) => {
  // Helper to check if a path is a use-m file
  const isUseMFile = (path) => {
    // Stack-frame URLs still include their :line:column suffix here. Browser
    // module URLs may also carry a cache-busting query or fragment.
    const normalizedPath = path
      .replace(/:\d+:\d+$/, '')
      .replace(/[?#].*$/, '')
      .replaceAll('\\', '/');
    return normalizedPath.endsWith('/use.mjs') ||
           normalizedPath.endsWith('/use.cjs') ||
           normalizedPath.endsWith('/use.js');
  };

  // In browser environment, use the current document URL as fallback
  if (typeof window !== 'undefined' && window.location) {
    // For inline scripts in HTML, use the document's URL
    // This will be the fallback if we can't extract from stack
    const documentUrl = window.location.href;

    // Try to extract from stack first, but we'll fallback to document URL
    if (!stack) return documentUrl;
  } else if (!stack) {
    return null;
  }

  const lines = stack.split('\n');
  // Look for the first file that isn't use.mjs/use.cjs/use.js - skip the first few frames
  // to get past our internal function calls
  for (const line of lines) {
    // Skip the first few frames which are internal to use-m
    if (line.includes('extractCallerContext') ||
      line.includes('_use') ||
      line.includes('makeUse') ||
      (line.includes('<anonymous>') && (line.includes('/use.mjs') || line.includes('/use.cjs') || line.includes('/use.js')))) {
      continue;
    }

    // Try to match http(s):// URLs for browser environments
    let match = line.match(/https?:\/\/[^\s)]+/);
    if (match && !isUseMFile(match[0])) {
      // Remove line:column numbers if present
      const url = match[0].replace(/:\d+:\d+$/, '');
      return url;
    }

    // Try to match file:// URLs
    match = line.match(/file:\/\/[^\s)]+/);
    if (match && !isUseMFile(match[0])) {
      // Remove line:column numbers if present
      const url = match[0].replace(/:\d+:\d+$/, '');
      return url;
    }

    // Special handling for Jest environment
    // Jest paths often look like: at Object.<anonymous> (/path/to/test.mjs:7:24)
    // Or: at /path/to/test.mjs:7:24
    if (line.includes('.test.') || line.includes('.spec.')) {
      // Try to extract the actual test file path from Jest stack traces
      match = line.match(/\(([^)]+\.(?:test|spec)\.[^)]+):\d+:\d+\)/);
      if (!match) {
        match = line.match(/([^(\s]+\.(?:test|spec)\.[^(\s:]+):\d+:\d+/);
      }
      if (match && match[1]) {
        const testPath = match[1];
        // Convert to file:// URL format if it's an absolute path
        if (testPath.startsWith('/') || /^[A-Za-z]:[\\/]/.test(testPath) || testPath.startsWith('\\\\')) {
          return absolutePathToFileUrl(testPath);
        }
      }
    }

    // Native Windows stack frames use drive-letter or UNC paths. Passing a
    // drive-letter path directly to import() is interpreted as a URL scheme.
    match = line.match(/(?:\(|\s)((?:[A-Za-z]:[\\/]|\\\\)[^)\n]+?\.(?:m?js|json)):\d+:\d+\)?/);
    if (match && !isUseMFile(match[1]) && !match[1].includes('node_modules')) {
      return absolutePathToFileUrl(match[1]);
    }

    // For Node/Deno, try to match absolute paths (improved to handle more cases)
    match = line.match(/at\s+(?:Object\.<anonymous>\s+)?(?:async\s+)?[(]?(\/[^\s:)]+\.(?:m?js|json))(?::\d+:\d+)?\)?/);
    if (match && !isUseMFile(match[1]) && !match[1].includes('node_modules')) {
      return absolutePathToFileUrl(match[1]);
    }

    // Alternative pattern for Jest and other environments
    match = line.match(/at\s+[^(]*\(([^)]+\.(?:m?js|json)):\d+:\d+\)/);
    if (match && !isUseMFile(match[1]) && !match[1].includes('node_modules')) {
      return absolutePathToFileUrl(match[1]);
    }
  }
  return null;
};
const parseModuleSpecifier = (moduleSpecifier) => {
  if (!moduleSpecifier || typeof moduleSpecifier !== 'string' || moduleSpecifier.length <= 0) {
    throw new Error(
      `Name for a package to be imported is not provided.
Please specify package name and an optional version (e.g., 'lodash', 'lodash@4.17.21' or '@chakra-ui/react@1.0.0').`
    );
  }
  const regex = /^(?<packageName>(@[^@/]+\/)?[^@/]+)?(?:@(?<version>[^/]*))?(?<modulePath>(?:\/[^@]+)*)?$/;
  const match = moduleSpecifier.match(regex);
  if (!match || typeof match.groups.packageName !== 'string' || match.groups.packageName.trim() === '') {
    throw new Error(
      `Failed to parse package identifier '${moduleSpecifier}'.
Please specify a package name, and an optional version (e.g.: 'lodash', 'lodash@4.17.21' or '@chakra-ui/react@1.0.0').`
    );
  }
  let { packageName, version, modulePath } = match.groups;
  if (typeof version !== 'string' || version.trim() === '') {
    version = 'latest';
  }
  if (typeof modulePath !== 'string' || modulePath.trim() === '') {
    modulePath = '';
  }
  return { packageName, version, modulePath };
}

const unresolvedPackageExport = Symbol('unresolvedPackageExport');
const primaryPackageExportConditions = new Set(['node', 'import', 'default']);
const legacyPackageExportConditions = new Set(['node', 'require', 'module', 'browser', 'default']);

const selectPackageExportTarget = (value, patternMatch, conditions) => {
  if (value === null) {
    return null;
  }
  if (typeof value === 'string') {
    return patternMatch === null ? value : value.replaceAll('*', patternMatch);
  }
  if (Array.isArray(value)) {
    for (const candidate of value) {
      const selected = selectPackageExportTarget(candidate, patternMatch, conditions);
      if (selected !== unresolvedPackageExport) {
        return selected;
      }
    }
    return unresolvedPackageExport;
  }
  if (value && typeof value === 'object') {
    for (const [condition, candidate] of Object.entries(value)) {
      if (condition !== 'default' && !conditions.has(condition)) {
        continue;
      }
      const selected = selectPackageExportTarget(candidate, patternMatch, conditions);
      if (selected !== unresolvedPackageExport) {
        return selected;
      }
    }
  }
  return unresolvedPackageExport;
};

const matchPackageExport = (exportsField, packageSubpath) => {
  if (packageSubpath === '.') {
    if (typeof exportsField === 'string' || Array.isArray(exportsField) || exportsField === null) {
      return { matched: true, patternMatch: null, value: exportsField };
    }
    if (exportsField && typeof exportsField === 'object') {
      if (Object.prototype.hasOwnProperty.call(exportsField, '.')) {
        return { matched: true, patternMatch: null, value: exportsField['.'] };
      }
      if (Object.keys(exportsField).every(key => !key.startsWith('.'))) {
        return { matched: true, patternMatch: null, value: exportsField };
      }
    }
    return { matched: false };
  }

  if (!exportsField || typeof exportsField !== 'object' || Array.isArray(exportsField)) {
    return { matched: false };
  }
  if (Object.prototype.hasOwnProperty.call(exportsField, packageSubpath)) {
    return { matched: true, patternMatch: null, value: exportsField[packageSubpath] };
  }

  let bestMatch = null;
  for (const [key, value] of Object.entries(exportsField)) {
    const wildcardIndex = key.indexOf('*');
    if (!key.startsWith('./') || wildcardIndex === -1) {
      continue;
    }
    const prefix = key.slice(0, wildcardIndex);
    const suffix = key.slice(wildcardIndex + 1);
    if (!packageSubpath.startsWith(prefix)
      || !packageSubpath.endsWith(suffix)
      || packageSubpath.length < prefix.length + suffix.length) {
      continue;
    }
    if (!bestMatch
      || prefix.length > bestMatch.prefixLength
      || (prefix.length === bestMatch.prefixLength && key.length > bestMatch.keyLength)) {
      bestMatch = {
        keyLength: key.length,
        patternMatch: packageSubpath.slice(prefix.length, packageSubpath.length - suffix.length),
        prefixLength: prefix.length,
        value,
      };
    }
  }
  return bestMatch
    ? { matched: true, patternMatch: bestMatch.patternMatch, value: bestMatch.value }
    : { matched: false };
};

const resolvePackageExportTarget = (exportsField, packageSubpath) => {
  const match = matchPackageExport(exportsField, packageSubpath);
  if (!match.matched) {
    return unresolvedPackageExport;
  }
  const selected = selectPackageExportTarget(
    match.value,
    match.patternMatch,
    primaryPackageExportConditions
  );
  return selected !== unresolvedPackageExport
    ? selected
    : selectPackageExportTarget(match.value, match.patternMatch, legacyPackageExportConditions);
};

// Not plain callback APIs: the runtime's own promise versions are kept as is.
const nonCallbackFileApis = new Set(['glob', 'watch']);

// Wraps a promisified callback API in an async function declaring `arity`
// parameters, so `.length` and `constructor.name` match Node's promise API.
// The rest parameter forwards every argument regardless of declared count.
// Index 0 declares one parameter: a promise API always takes at least the path
// or handle it operates on.
const asyncFunctionsByArity = [
  (call) => async (a, ...rest) => call(a, ...rest),
  (call) => async (a, b, ...rest) => call(a, b, ...rest),
  (call) => async (a, b, c, ...rest) => call(a, b, c, ...rest),
  (call) => async (a, b, c, d, ...rest) => call(a, b, c, d, ...rest),
  (call) => async (a, b, c, d, e, ...rest) => call(a, b, c, d, e, ...rest)
];
const minimumFileApiArity = 1;
const maximumFileApiArity = minimumFileApiArity + asyncFunctionsByArity.length - 1;
const toAsyncFunction = (call, arity, name) => {
  // A callback API can declare fewer parameters than it accepts when the
  // middle ones have defaults (`fs.stat.length` is 1 on Deno and on Node),
  // which would derive an arity of 0. The derived arity is therefore clamped
  // into the range the wrappers cover, so every rebuilt entry stays an
  // AsyncFunction: out of range, the bare `promisify` result was used instead,
  // and that is a plain Function of length 0.
  const clamped = Math.min(Math.max(arity, minimumFileApiArity), maximumFileApiArity);
  const wrapped = asyncFunctionsByArity[clamped - minimumFileApiArity](call);
  try {
    Object.defineProperty(wrapped, 'name', { value: name });
  } catch (error) {
    // `name` is not configurable on every runtime; the wrapper still works.
  }
  return wrapped;
};

// Built-ins are discovered at runtime through `node:module` instead of being
// enumerated here, so every built-in the host runtime knows about is loadable,
// including ones added after this release (issue #50). Listed below are only
// the modules needing more than the generic `import('node:<name>')` loader:
// `browser` for environments without a `node:` namespace, `node` for a runtime
// whose built-in differs from Node's. Anything left out uses the generic loader.
const builtinOverrides = {
  'console': {
    browser: () => ({ default: console, log: console.log, error: console.error, warn: console.warn, info: console.info })
  },
  'crypto': {
    browser: () => ({ default: crypto, subtle: crypto.subtle })
  },
  'url': {
    browser: () => ({ default: URL, URL, URLSearchParams })
  },
  // 'performance' is not a built-in module name: use-m maps it onto the
  // performance object, which lives in node:perf_hooks on the Node.js side.
  'performance': {
    browser: () => ({ default: performance, now: performance.now.bind(performance) }),
    node: () => import('node:perf_hooks').then(m => ({ default: m.performance, performance: m.performance, now: m.performance.now.bind(m.performance), ...m }))
  },
  // Bun and Deno expose `node:fs/promises` functions whose arity and
  // constructor differ from Node's, so the promise API is rebuilt from the
  // callback API there. Which functions exist and how many arguments each one
  // takes is read from the runtime itself, never listed here.
  'fs/promises': {
    node: async () => {
      if (typeof Bun === 'undefined' && typeof Deno === 'undefined') {
        return loadBuiltinModule('fs/promises');
      }
      const fs = await import('node:fs');
      const { promisify } = await import('node:util');
      const promises = {};
      for (const [name, value] of Object.entries(await import('node:fs/promises'))) {
        if (name === 'default') {
          continue;
        }
        const callbackApi = fs[name];
        const rebuildable = typeof value === 'function'
          && typeof callbackApi === 'function'
          && !nonCallbackFileApis.has(name);
        promises[name] = rebuildable
          ? toAsyncFunction(promisify(callbackApi), callbackApi.length - 1, name)
          : value;
      }
      return { default: promises, ...promises };
    }
  },
};

// Built-ins with no browser implementation. `node:module` is itself unavailable
// in a browser, so this is the one list that cannot be derived at runtime. It
// only chooses between a clear "not available" error and the CDN resolvers, and
// never limits what Node.js, Bun or Deno can load.
const browserUnavailableBuiltins = new Set([
  'assert', 'buffer', 'child_process', 'dns', 'dns/promises', 'events', 'fs',
  'fs/promises', 'http', 'https', 'net', 'os', 'path', 'process', 'querystring',
  'readline/promises', 'stream', 'stream/promises', 'timers/promises', 'util',
  'zlib'
]);

// `module.isBuiltin()` is the authoritative check (Node.js >= 18.6, Bun, Deno);
// older runtimes only expose `module.builtinModules`, and environments without
// `node:module` at all have no built-ins. Resolved once and reused.
let builtinCheck = null;
const isBuiltinModule = async (moduleName) => {
  if (!builtinCheck) {
    builtinCheck = import('node:module').then(
      (m) => {
        if (typeof m.isBuiltin === 'function') {
          return m.isBuiltin;
        }
        const builtins = new Set(m.builtinModules || []);
        return (name) => builtins.has(name) || builtins.has(name.replace(/^node:/, ''));
      },
      () => () => false
    );
  }
  return (await builtinCheck)(moduleName);
};

// Generic loader for built-ins without an override. `...m` spreads after
// `default`, so namespaces carrying their own default export keep it
// (node:events -> EventEmitter, node:stream -> Stream, node:assert -> assert).
const loadBuiltinModule = async (moduleName) => {
  const m = await import(`node:${moduleName}`);
  return { default: m, ...m };
};

// Source fragment: Node engine policy for automatic npm version selection.
// npmSemver is embedded by the bundle builder, including its ISC license.

const quoteNpmArgument = (argument) => process.platform === 'win32'
  ? `"${argument.replaceAll('"', '\\"')}"`
  : `'${argument.replaceAll("'", "'\\''")}'`;

const supportsNodeEngine = (manifest, nodeVersion) => {
  const engine = manifest?.engines?.node;
  return engine === undefined || engine === '' ||
    (typeof engine === 'string' && npmSemver.satisfies(nodeVersion, engine, { includePrerelease: true }));
};

const selectNodeCompatibleVersion = (metadata, packageName, requestedVersion, nodeVersion, debug) => {
  const manifests = Array.isArray(metadata) ? metadata
    : metadata?.versions && typeof metadata.versions === 'object' && !Array.isArray(metadata.versions)
      ? Object.entries(metadata.versions).map(([version, manifest]) => ({ ...manifest, version }))
      : metadata?.version ? [metadata] : null;
  if (!manifests || manifests.some(manifest => !npmSemver.valid(manifest?.version))) {
    throw new Error('npm registry metadata did not contain valid version manifests.');
  }
  const range = requestedVersion === 'latest' ? '*' : requestedVersion;
  const candidates = manifests.filter(manifest => npmSemver.satisfies(manifest.version, range))
    .sort((a, b) => npmSemver.rcompare(a.version, b.version));
  const selected = candidates.find(manifest => supportsNodeEngine(manifest, nodeVersion));
  if (!selected) {
    const newest = candidates[0];
    const detail = newest ? `; ${packageName}@${newest.version} requires Node ${newest.engines?.node}` : '';
    const error = new Error(
      `No release of ${packageName}@${requestedVersion} is compatible with Node${detail}; ` +
      `running ${nodeVersion}. Pin a version or upgrade Node, or set engineStrict: false to bypass this check.`
    );
    error.code = 'USE_M_UNSUPPORTED_NODE';
    throw error;
  }
  if (selected.version !== candidates[0]?.version) {
    const newest = candidates[0];
    debug(1, `${packageName}@${requestedVersion} is ${newest.version} (engines node ${newest.engines?.node}) — ` +
      `using ${selected.version}, the newest release compatible with Node ${nodeVersion}`);
  }
  return { version: selected.version, ...(selected.engines ? { engines: selected.engines } : {}) };
};

// Source fragment: built-in, npm, Bun, Deno, and CDN resolvers.
// Generated bundles concatenate this file; do not import it directly.

const resolvers = {
  builtin: async (moduleSpecifier, pathResolver) => {
    const { packageName, modulePath } = parseModuleSpecifier(moduleSpecifier);

    // Handle built-in modules with subpaths like 'node:fs/promises'
    const hasNodePrefix = packageName.startsWith('node:');
    const moduleName = (hasNodePrefix ? packageName.slice(5) : packageName) + modulePath;

    // Determine environment
    const isBrowser = typeof window !== 'undefined';
    const environment = isBrowser ? 'browser' : 'node';

    const moduleFactory = builtinOverrides[moduleName]?.[environment];
    if (moduleFactory) {
      try {
        // Execute the factory function to get the module
        return await moduleFactory();
      } catch (error) {
        throw new Error(`Failed to load built-in module '${moduleName}' in ${environment} environment.`, { cause: error });
      }
    }

    if (isBrowser) {
      // No browser implementation: report the well-known Node.js-only built-ins
      // explicitly and let every other specifier fall through to the resolvers
      // that fetch packages from a CDN.
      if (browserUnavailableBuiltins.has(moduleName)) {
        throw new Error(`Built-in module '${moduleName}' is not available in ${environment} environment.`);
      }
      return null;
    }

    // Ask the runtime whether this is a built-in, matching how the runtime
    // itself resolves the specifier: 'node:sqlite' and 'node:test' are built-in
    // only with the prefix, so bare 'sqlite' or 'test' must stay npm packages.
    if (!await isBuiltinModule(hasNodePrefix ? `node:${moduleName}` : moduleName)) {
      // Not a built-in module
      return null;
    }

    try {
      return await loadBuiltinModule(moduleName);
    } catch (error) {
      throw new Error(`Failed to load built-in module '${moduleName}' in ${environment} environment.`, { cause: error });
    }
  },
  relative: async (moduleSpecifier, pathResolver, callerContext) => {
    // Check if this is a relative path (supports any depth: ./, ../, ../../, etc.)
    if (!moduleSpecifier.startsWith('./') && !moduleSpecifier.startsWith('../')) {
      return null;
    }

    // Try to get the caller's URL from the context or stack trace
    let callerUrl = callerContext;
    let resolvedPath = null;

    // If we have a caller URL, resolve relative to it
    if (callerUrl && (callerUrl.startsWith('file://') || callerUrl.startsWith('http://') || callerUrl.startsWith('https://'))) {
      try {
        // Keep URL-based resolution as a URL on every runtime. A pathname such
        // as /C:/... is not a valid native Windows path and breaks Bun imports.
        const url = new URL(moduleSpecifier, callerUrl);
        resolvedPath = url.href;
      } catch (error) {
        // Fallback for non-URL basePath (only for file:// URLs)
        if (callerUrl.startsWith('file://')) {
          const path = await import('node:path');
          const normalizedPath = new URL(callerUrl).pathname;
          resolvedPath = path.resolve(path.dirname(normalizedPath), moduleSpecifier);
        }
      }
    }

    // If we couldn't resolve with URL, try pathResolver
    if (!resolvedPath) {
      if (!pathResolver) {
        throw new Error('Path resolver is required for relative path resolution.');
      }

      try {
        // Use the provided pathResolver to resolve the relative path
        resolvedPath = await pathResolver(moduleSpecifier);
      } catch (error) {
        throw new Error(`Failed to resolve relative path '${moduleSpecifier}'.`, { cause: error });
      }
    }

    // Import the module and return it
    // Check if this is a JSON file and handle it specially
    if (resolvedPath.endsWith('.json')) {
      try {
        // For JSON files, we need to use import assertions
        const module = await import(resolvedPath, { with: { type: 'json' } });
        return module.default || module;
      } catch (error) {
        // Fallback to baseUse if import assertions fail
        return baseUse(resolvedPath);
      }
    }

    return baseUse(resolvedPath);
  },
  npm: async (moduleSpecifier, pathResolver, options = {}) => {
    const { packageName, version, modulePath } = parseModuleSpecifier(moduleSpecifier);
    const path = await import('node:path');
    const { exec } = await import('node:child_process');
    const { createHash } = await import('node:crypto');
    const { promisify } = await import('node:util');
    const { access, mkdir, readFile, readlink, rename, rm, rmdir, stat, unlink, utimes, writeFile } = await import('node:fs/promises');
    const { constants: fsConstants } = await import('node:fs');
    const os = await import('node:os');
    const execAsync = promisify(exec);
    const npmEnvSource = options?.env || process.env;
    const baseNpmEnv = { ...npmEnvSource };
    const engineStrict = options?.engineStrict ?? !['false', '0'].includes(baseNpmEnv.USE_M_ENGINE_STRICT);
    const engineAware = engineStrict && (version === 'latest' ||
      (!npmSemver.valid(version) && npmSemver.validRange(version) !== null));
    const nodeVersion = process.versions.node;
    const versionCacheKey = (registry, name) => JSON.stringify(engineAware
      ? [registry, name, 'engines-v1', nodeVersion, version]
      : [registry, name]);
    const installMaxAttempts = Number.isInteger(options?.installMaxAttempts) && options.installMaxAttempts > 0
      ? options.installMaxAttempts
      : 3;
    const installRetryDelayMs = typeof options?.installRetryDelayMs === 'number' && options.installRetryDelayMs >= 0
      ? options.installRetryDelayMs
      : 1000;
    const registryMaxAttempts = Number.isInteger(options?.registryMaxAttempts) && options.registryMaxAttempts > 0
      ? options.registryMaxAttempts
      : 3;
    // Timings of the cross-process install lock (see `acquireInstallLock`).
    const durationOption = (value, fallback) =>
      typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : fallback;
    const registryRetryDelayMs = durationOption(options?.registryRetryDelayMs, 250);
    const registryRequestTimeoutMs = durationOption(options?.registryRequestTimeoutMs, 10000);
    const latestVersionCacheTtlMs = durationOption(options?.latestVersionCacheTtlMs, 300000);
    // How often the lock owner refreshes the lock's mtime.
    const installLockHeartbeatMs = durationOption(options?.installLockHeartbeatMs, 1000);
    // How long a lock may go unrefreshed before a waiter treats it as abandoned.
    const installLockStaleMs = durationOption(options?.installLockStaleMs, 30000);
    // How long a waiter sleeps between acquisition attempts.
    const installLockPollMs = durationOption(options?.installLockPollMs, 100);
    // How long a waiter waits before giving up and installing unlocked.
    const installLockTimeoutMs = durationOption(options?.installLockTimeoutMs, 300000);
    // Escape hatch: `installLock: false` restores the pre-8.15.0 unlocked installs.
    const installLockEnabled = options?.installLock !== false;
    const latestVersionCacheEnabled = options?.latestVersionCache !== false;
    const registryCliFallbackEnabled = options?.registryCliFallback !== false;
    const registryFetch = typeof options?.fetch === 'function'
      ? options.fetch
      : typeof globalThis.fetch === 'function'
        ? globalThis.fetch.bind(globalThis)
        : null;

    const debugSetting = options?.debug ?? baseNpmEnv.USE_M_DEBUG;
    const debugLevel = debugSetting === true || debugSetting === 'true'
      ? 1
      : debugSetting === 'verbose'
        ? 2
        : Number.isFinite(Number(debugSetting))
          ? Math.max(0, Math.min(2, Number(debugSetting)))
          : 0;
    const debugLogger = typeof options?.debugLogger === 'function'
      ? options.debugLogger
      : console.error;
    const debug = (level, message) => {
      if (debugLevel < level) return;
      try {
        debugLogger(`[use-m] ${message}`);
      } catch {
        // Diagnostics must never change resolver behavior.
      }
    };

    const sleep = (milliseconds) => new Promise(resolve => setTimeout(resolve, milliseconds));

    if (!pathResolver) {
      throw new Error('Failed to get the current resolver.');
    }

    const fileExists = async (filePath) => {
      try {
        const stats = await stat(filePath);
        return stats.isFile();
      } catch (error) {
        if (error.code !== 'ENOENT' && error.code !== 'ENOTDIR') {
          throw error;
        }
        return false;
      }
    };

    const directoryExists = async (directoryPath) => {
      try {
        const stats = await stat(directoryPath);
        return stats.isDirectory();
      } catch (error) {
        if (error.code !== 'ENOENT' && error.code !== 'ENOTDIR') {
          throw error;
        }
        return false;
      }
    };

    const tryResolveModule = async (packagePath) => {
      try {
        return await pathResolver(packagePath);
      } catch (error) {
        if (error.code !== 'MODULE_NOT_FOUND') {
          throw new Error(`Failed to resolve module '${packagePath}'`, { cause: error });
        }

        // Attempt to resolve paths like 'yargs@18.0.0/helpers' to 'yargs-v-18.0.0/helpers/helpers.mjs'
        if (await directoryExists(packagePath)) {
          const directoryName = path.basename(packagePath);
          const resolvedPath = await tryResolveModule(path.join(packagePath, directoryName));
          if (resolvedPath) {
            return resolvedPath;
          }

          // Attempt to resolve paths like 'octokit/core@latest' to 'octokit-core-v-latest/dist-src/index.js' (as it written in package.json)
          const packageJsonPath = path.join(packagePath, 'package.json');
          if (await fileExists(packageJsonPath)) {
            const packageJson = await readFile(packageJsonPath, 'utf8');
            const parsed = JSON.parse(packageJson);
            if (Object.prototype.hasOwnProperty.call(parsed, 'exports')) {
              const target = resolvePackageExportTarget(parsed.exports, '.');
              if (typeof target === 'string' && target.startsWith('./')) {
                const updatedPath = path.resolve(packagePath, target);
                return await tryResolveModule(updatedPath);
              }
            }
          }

          return null;
        }

        return null;
      }
    };

    const defaultRegistry = 'https://registry.npmjs.org/';

    const normalizeRegistry = (value) => {
      const registry = new URL(value || defaultRegistry);
      if (registry.protocol !== 'http:' && registry.protocol !== 'https:') {
        throw new Error(`Unsupported npm registry protocol '${registry.protocol}'.`);
      }
      // Fetch rejects URLs containing credentials, and neither cache files nor
      // debug output should ever persist an npm token embedded in the URL. npm
      // itself still receives the unmodified option through npm_config_registry.
      registry.username = '';
      registry.password = '';
      registry.search = '';
      registry.hash = '';
      if (!registry.pathname.endsWith('/')) {
        registry.pathname += '/';
      }
      return registry.href;
    };

    const getRegistry = async (env) => {
      const explicitRegistry = options?.registry ?? options?.npmRegistry;
      if (explicitRegistry) {
        env.npm_config_registry = String(explicitRegistry);
        return normalizeRegistry(explicitRegistry);
      }
      const environmentRegistry = env.npm_config_registry || env.NPM_CONFIG_REGISTRY;
      if (environmentRegistry) {
        return normalizeRegistry(environmentRegistry);
      }
      try {
        debug(2, 'reading registry from npm config');
        const { stdout } = await execAsync('npm config get registry', { env });
        const configuredRegistry = stdout.trim();
        if (configuredRegistry && configuredRegistry !== 'undefined' && configuredRegistry !== 'null') {
          return normalizeRegistry(configuredRegistry);
        }
      } catch (error) {
        debug(1, `npm config registry lookup failed; using the public registry (${error?.message || error})`);
      }
      return defaultRegistry;
    };

    const getLatestVersionCacheDirectory = (env) => {
      if (!latestVersionCacheEnabled) return null;
      if (typeof options?.latestVersionCacheDirectory === 'string') {
        return path.resolve(options.latestVersionCacheDirectory);
      }
      const home = env.HOME || env.USERPROFILE || os.homedir();
      if (!home) return null;
      const cacheHome = env.XDG_CACHE_HOME || path.join(home, '.cache');
      return path.join(cacheHome, 'use-m', 'registry');
    };

    const getLatestVersionCachePath = (cacheDirectory, registry, packageName) => {
      const digest = createHash('sha256')
        .update(versionCacheKey(registry, packageName))
        .digest('hex');
      return path.join(cacheDirectory, `${digest}.json`);
    };

    const isValidLatestVersionEntry = (entry, registry, packageName) =>
      entry &&
      entry.registry === registry &&
      entry.packageName === packageName &&
      typeof entry.version === 'string' &&
      entry.version.trim() !== '' &&
      typeof entry.fetchedAt === 'number' &&
      Number.isFinite(entry.fetchedAt) &&
      (!engineAware || (entry.nodeVersion === nodeVersion && entry.requestedVersion === version &&
        entry.metadata?.version === entry.version && supportsNodeEngine(entry.metadata, nodeVersion) &&
        npmSemver.satisfies(entry.version, version === 'latest' ? '*' : version)));

    const readLatestVersionCache = async (registry, packageName, env) => {
      if (!latestVersionCacheEnabled) return null;
      const cacheKey = versionCacheKey(registry, packageName);
      let cached = npmLatestVersionMemoryCache.get(cacheKey) || null;
      const cacheDirectory = getLatestVersionCacheDirectory(env);
      if (cacheDirectory) {
        const cachePath = getLatestVersionCachePath(cacheDirectory, registry, packageName);
        try {
          const diskEntry = JSON.parse(await readFile(cachePath, 'utf8'));
          if (isValidLatestVersionEntry(diskEntry, registry, packageName)
            && (!cached || diskEntry.fetchedAt > cached.fetchedAt)) {
            cached = diskEntry;
            npmLatestVersionMemoryCache.set(cacheKey, diskEntry);
          }
        } catch {
          // A missing, partial or old cache file is simply a cache miss.
        }
      }
      if (!cached) return null;
      const age = Math.max(0, Date.now() - cached.fetchedAt);
      const fresh = age <= latestVersionCacheTtlMs;
      debug(2, `${fresh ? 'fresh' : 'stale'} latest-version cache hit for ${packageName} (${cached.version})`);
      return { ...cached, fresh };
    };

    const writeLatestVersionCache = async (registry, packageName, selectedVersion, env, metadata) => {
      if (!latestVersionCacheEnabled) return;
      const entry = { registry, packageName, version: selectedVersion, fetchedAt: Date.now(),
        ...(engineAware ? { metadata, nodeVersion, requestedVersion: version } : {}) };
      const cacheKey = versionCacheKey(registry, packageName);
      npmLatestVersionMemoryCache.set(cacheKey, entry);
      const cacheDirectory = getLatestVersionCacheDirectory(env);
      if (!cacheDirectory) return;
      const cachePath = getLatestVersionCachePath(cacheDirectory, registry, packageName);
      const temporaryPath = `${cachePath}.${process.pid}.${Date.now()}.${Math.random().toString(16).slice(2)}.tmp`;
      try {
        await mkdir(cacheDirectory, { recursive: true });
        await writeFile(temporaryPath, `${JSON.stringify(entry)}\n`);
        await rename(temporaryPath, cachePath);
        debug(2, `cached latest version for ${packageName} at ${cachePath}`);
      } catch (error) {
        debug(1, `could not persist latest-version cache for ${packageName} (${error?.message || error})`);
        await unlink(temporaryPath).catch(() => {});
      }
    };

    const getRegistryEndpoint = (registry, packageName, fullMetadata) =>
      new URL(`${encodeURIComponent(packageName)}${fullMetadata ? '' : '/latest'}`, registry).href;

    const isTransientRegistryFailure = (error) => {
      const status = error?.status;
      return status === 403 || status === 408 || status === 425 || status === 429 || status >= 500;
    };

    const fetchRegistryMetadata = async (registry, packageName, fullMetadata = false) => {
      if (!registryFetch) {
        throw new Error('This runtime does not provide fetch.');
      }
      const endpoint = getRegistryEndpoint(registry, packageName, fullMetadata);
      let lastError;
      for (let attempt = 1; attempt <= registryMaxAttempts; attempt++) {
        let timeout = null;
        const controller = new AbortController();
        try {
          debug(2, `registry attempt ${attempt}/${registryMaxAttempts} for ${packageName} at ${endpoint}`);
          if (registryRequestTimeoutMs > 0) {
            timeout = setTimeout(() => controller.abort(), registryRequestTimeoutMs);
          }
          const registryResponse = await registryFetch(endpoint, {
            headers: { accept: fullMetadata ? 'application/vnd.npm.install-v1+json' : 'application/json' },
            signal: controller.signal,
          });
          if (!registryResponse?.ok) {
            const error = new Error(
              `npm registry returned ${registryResponse?.status || 'an unknown status'} ${registryResponse?.statusText || ''}`.trim()
            );
            error.status = registryResponse?.status;
            throw error;
          }
          const metadata = await registryResponse.json();
          if (!fullMetadata && (typeof metadata?.version !== 'string' || metadata.version.trim() === '')) {
            throw new Error('npm registry metadata did not contain a version.');
          }
          return metadata;
        } catch (error) {
          lastError = error;
          const retryable = error?.name === 'AbortError' || error?.status === undefined || isTransientRegistryFailure(error);
          if (!retryable || attempt === registryMaxAttempts) break;
          const delay = registryRetryDelayMs * (2 ** (attempt - 1));
          debug(1, `registry attempt ${attempt}/${registryMaxAttempts} failed for ${packageName}; retrying in ${delay}ms (${error?.message || error})`);
          if (delay > 0) await sleep(delay);
        } finally {
          if (timeout) clearTimeout(timeout);
        }
      }
      throw lastError;
    };

    const getLatestVersion = async (packageName, env, installedPackagePath) => {
      const registry = await getRegistry(env);
      const cached = await readLatestVersionCache(registry, packageName, env);
      if (cached?.fresh) return cached.version;

      const failures = [];
      try {
        const { version } = await fetchRegistryMetadata(registry, packageName);
        await writeLatestVersionCache(registry, packageName, version, env);
        return version;
      } catch (error) {
        failures.push(error);
        debug(1, `direct registry lookup failed for ${packageName}; trying npm CLI (${error?.message || error})`);
      }

      if (registryCliFallbackEnabled) {
        try {
          const { stdout } = await execAsync(`npm show ${packageName} version`, { env });
          const version = stdout.trim();
          if (!version) throw new Error('npm show returned an empty version.');
          await writeLatestVersionCache(registry, packageName, version, env);
          return version;
        } catch (error) {
          failures.push(error);
          debug(1, `npm CLI latest-version lookup failed for ${packageName} (${error?.message || error})`);
        }
      }

      if (cached) {
        debug(1, `using stale cached latest version ${cached.version} for ${packageName}`);
        return cached.version;
      }
      const installedVersion = installedPackagePath
        ? await getInstalledPackageVersion(installedPackagePath)
        : null;
      if (installedVersion) {
        debug(1, `using installed version ${installedVersion} for unavailable latest metadata of ${packageName}`);
        return installedVersion;
      }

      const cause = failures[failures.length - 1];
      throw new Error(
        `Failed to determine the latest version of '${packageName}' from '${registry}'. ` +
        `Pin a known version, for example '${packageName}@1.2.3', or retry when the registry is available.`,
        { cause }
      );
    };

    const getInstalledPackageMetadata = async (packagePath) => {
      try {
        return JSON.parse(await readFile(path.join(packagePath, 'package.json'), 'utf8'));
      } catch {
        return null;
      }
    };
    const getInstalledPackageVersion = async (packagePath) =>
      (await getInstalledPackageMetadata(packagePath))?.version || null;

    const getCompatibleVersion = async (packageName, env, installedPackagePath) => {
      const registry = await getRegistry(env);
      const cached = await readLatestVersionCache(registry, packageName, env);
      if (cached?.fresh) return cached.version;
      const select = metadata => selectNodeCompatibleVersion(metadata, packageName, version, nodeVersion, debug);
      const save = async metadata => {
        const selected = select(metadata);
        await writeLatestVersionCache(registry, packageName, selected.version, env, selected);
        return selected.version;
      };
      let lastError;
      try {
        return await save(await fetchRegistryMetadata(registry, packageName, true));
      } catch (error) {
        if (error.code === 'USE_M_UNSUPPORTED_NODE') throw error;
        lastError = error;
        debug(1, `direct engine metadata lookup failed for ${packageName}; trying npm CLI (${error.message})`);
      }
      if (registryCliFallbackEnabled) {
        try {
          // npm view pkg@* returns a manifest for every stable published version,
          // unlike npm view pkg, whose versions array has no per-version engines.
          const selector = version === 'latest' ? '*' : version;
          const { stdout } = await execAsync(
            `npm view ${quoteNpmArgument(`${packageName}@${selector}`)} version engines --json`,
            { env, maxBuffer: 16 * 1024 * 1024 }
          );
          return await save(JSON.parse(stdout));
        } catch (error) {
          if (error.code === 'USE_M_UNSUPPORTED_NODE') throw error;
          lastError = error;
          debug(1, `npm CLI engine metadata lookup failed for ${packageName} (${error.message})`);
        }
      }
      if (cached) {
        debug(1, `using stale cached compatible version ${cached.version} for ${packageName}`);
        return cached.version;
      }
      const installed = await getInstalledPackageMetadata(installedPackagePath);
      if (installed?.version) {
        const selected = select(installed);
        debug(1, `using installed compatible version ${selected.version} for unavailable metadata of ${packageName}`);
        return selected.version;
      }
      throw new Error(
        `Failed to determine a Node-compatible version of '${packageName}@${version}' from '${registry}'. ` +
        `Pin a known version, for example '${packageName}@1.2.3', or retry when the registry is available.`,
        { cause: lastError }
      );
    };

    const getConfiguredNpmPrefix = (env) => env.npm_config_prefix || env.NPM_CONFIG_PREFIX || '';

    const getNpmGlobalRoot = async (env) => {
      debug(2, 'running npm root -g');
      const { stdout: globalModulesPath } = await execAsync('npm root -g', { env });
      const trimmedPath = globalModulesPath.trim();
      if (!trimmedPath) {
        throw new Error('npm root -g returned an empty global root.');
      }
      debug(2, `npm global root is ${trimmedPath}`);
      return trimmedPath;
    };

    const isWritableDirectoryPath = async (directoryPath) => {
      let currentPath = directoryPath;
      while (currentPath && currentPath !== path.dirname(currentPath)) {
        try {
          const stats = await stat(currentPath);
          if (!stats.isDirectory()) {
            return false;
          }
          await access(currentPath, fsConstants.W_OK);
          return true;
        } catch (error) {
          if (error.code === 'ENOENT') {
            currentPath = path.dirname(currentPath);
            continue;
          }
          return false;
        }
      }
      try {
        await access(currentPath, fsConstants.W_OK);
        return true;
      } catch {
        return false;
      }
    };

    const getUseMCachePrefix = (env) => {
      const home = env.HOME || env.USERPROFILE || os.homedir();
      if (!home) {
        return null;
      }
      const cacheHome = env.XDG_CACHE_HOME || path.join(home, '.cache');
      return path.join(cacheHome, 'use-m', 'npm-global');
    };

    const withNpmPrefix = (env, prefix) => {
      const nextEnv = { ...env, npm_config_prefix: prefix };
      const pathKey = Object.keys(nextEnv).find(key => key.toLowerCase() === 'path') || 'PATH';
      const binPath = path.join(prefix, 'bin');
      nextEnv[pathKey] = nextEnv[pathKey]
        ? `${binPath}${path.delimiter}${nextEnv[pathKey]}`
        : binPath;
      return nextEnv;
    };

    const getWritableInstallContext = async (globalModulesPath, env) => {
      if (await isWritableDirectoryPath(globalModulesPath)) {
        return { env, globalModulesPath };
      }

      const configuredPrefix = getConfiguredNpmPrefix(env);
      if (configuredPrefix) {
        throw new Error(
          `The configured npm global root '${globalModulesPath}' is not writable. ` +
          `use-m will not override the configured npm prefix '${configuredPrefix}'. ` +
          `Set npm_config_prefix to a writable directory or make the configured prefix writable.`
        );
      }

      const fallbackPrefix = getUseMCachePrefix(env);
      if (!fallbackPrefix) {
        throw new Error(
          `The npm global root '${globalModulesPath}' is not writable, and use-m could not determine a home directory for its npm cache prefix. ` +
          `Set npm_config_prefix to a writable directory before using npm-backed use-m imports.`
        );
      }

      const fallbackEnv = withNpmPrefix(env, fallbackPrefix);
      debug(1, `npm global root is not writable; using the use-m prefix ${fallbackPrefix}`);
      let fallbackGlobalModulesPath;
      try {
        fallbackGlobalModulesPath = await getNpmGlobalRoot(fallbackEnv);
      } catch (error) {
        throw new Error(`Failed to resolve use-m npm cache root with prefix '${fallbackPrefix}'.`, { cause: error });
      }

      try {
        await mkdir(fallbackGlobalModulesPath, { recursive: true });
      } catch (error) {
        throw new Error(`Failed to create use-m npm cache root '${fallbackGlobalModulesPath}'.`, { cause: error });
      }

      if (!await isWritableDirectoryPath(fallbackGlobalModulesPath)) {
        throw new Error(
          `The npm global root '${globalModulesPath}' is not writable, and the use-m npm cache root '${fallbackGlobalModulesPath}' is not writable. ` +
          `Set npm_config_prefix to a writable directory before using npm-backed use-m imports.`
        );
      }

      return { env: fallbackEnv, globalModulesPath: fallbackGlobalModulesPath };
    };

    // use-m's own bookkeeping inside the npm global root: one lock directory and
    // one completion marker per alias. The directory name starts with a dot so
    // npm skips it while reading the global tree, the same way it skips `.bin`
    // and `.package-lock.json`.
    const getStatePath = (globalModulesPath, fileName) =>
      path.join(globalModulesPath, '.use-m', fileName);
    const getInstallLockPath = (globalModulesPath, alias) =>
      getStatePath(globalModulesPath, `${alias}.lock`);
    const getInstallMarkerPath = (globalModulesPath, alias) =>
      getStatePath(globalModulesPath, `${alias}.installed.json`);

    const readInstallMarker = async (markerPath) => {
      try {
        return JSON.parse(await readFile(markerPath, 'utf8'));
      } catch {
        return null;
      }
    };

    // The marker is written only after `npm install` returned, so — unlike
    // package.json, which npm extracts first — its presence means extraction
    // finished. Writing it is best effort: a read-only global root only loses
    // the fast path, it must not fail the import.
    const writeInstallMarker = async (markerPath, marker) => {
      const temporaryPath = `${markerPath}.${process.pid}.tmp`;
      try {
        await mkdir(path.dirname(markerPath), { recursive: true });
        await writeFile(temporaryPath, `${JSON.stringify(marker)}\n`);
        await rename(temporaryPath, markerPath);
      } catch {
        await unlink(temporaryPath).catch(() => {});
      }
    };

    // Called before the alias tree changes, so no concurrent reader can trust a
    // marker that describes the tree we are about to replace.
    const removeInstallMarker = async (markerPath) => {
      await unlink(markerPath).catch(() => {});
    };

    // `adopt: true` may only be used while holding the alias lock. Without a
    // marker the only evidence available is the tree itself, and every such
    // check is true long before extraction finishes: a directory exists as soon
    // as npm creates it, and package.json carries the final version from the
    // first extracted file onwards. That check-then-act window is how a
    // concurrent caller used to import a half-written tree (issue #70), so
    // outside the lock an unmarked alias counts as not installed and the caller
    // re-checks under the lock instead.
    const isPackageInstalled = async (packagePath, version, latestVersion, markerPath, { adopt = false } = {}) => {
      if (!await directoryExists(packagePath)) {
        return false;
      }
      const marker = await readInstallMarker(markerPath);
      if (marker) {
        return latestVersion !== null ? marker.version === latestVersion : true;
      }
      if (!adopt) {
        return false;
      }
      const installedVersion = await getInstalledPackageVersion(packagePath);
      if (latestVersion !== null && installedVersion !== latestVersion) {
        return false;
      }
      // An alias installed by an older use-m (or by hand) carries no marker.
      // Adopt it instead of reinstalling, but only once it resolves — a tree
      // left behind by an interrupted install must not be adopted.
      let resolved = null;
      try {
        resolved = await tryResolveModule(packagePath);
      } catch {
        resolved = null;
      }
      if (!resolved) {
        return false;
      }
      await writeInstallMarker(markerPath, {
        alias: path.basename(packagePath),
        version: installedVersion,
        requestedVersion: version,
        adopted: true
      });
      return true;
    };

    const removePackageAlias = async (packagePath, reason) => {
      try {
        await rm(packagePath, {
          recursive: true,
          force: true,
          maxRetries: 5,
          retryDelay: 100
        });
      } catch (error) {
        throw new Error(`Failed to remove ${reason} npm alias '${packagePath}'.`, { cause: error });
      }
    };

    // A cross-process advisory lock over one alias directory. npm takes no lock
    // on the global prefix, so two `npm install -g <alias>` runs delete and
    // re-extract each other's trees; separate processes sharing one prefix (a CI
    // step, a daemon, containers on one volume) need a lock that outlives a
    // single process. `mkdir` is atomic on every filesystem, which is why the
    // lock is a directory rather than a file — the strategy proper-lockfile
    // uses. It is deliberately self-healing: the owner refreshes the mtime, a
    // lock left behind by a crashed owner is stolen once it goes stale, and
    // anything unexpected (an unwritable root, a peer that never finishes)
    // degrades to the previous unlocked behavior instead of hanging.
    const acquireInstallLock = async (lockPath) => {
      const unlocked = { acquired: false, release: async () => {} };
      if (!installLockEnabled) {
        return unlocked;
      }
      try {
        await mkdir(path.dirname(lockPath), { recursive: true });
      } catch {
        return unlocked;
      }
      const startedAt = Date.now();
      for (;;) {
        try {
          await mkdir(lockPath);
        } catch (error) {
          if (error?.code !== 'EEXIST') {
            return unlocked;
          }
          const stats = await stat(lockPath).catch(() => null);
          const expired = Date.now() - startedAt > installLockTimeoutMs;
          if (!stats) {
            // The owner released it between our mkdir and stat, so retry at
            // once — but still honor the deadline, so a peer that keeps
            // recreating the lock cannot spin us forever.
            if (expired) {
              return unlocked;
            }
            continue;
          }
          if (Date.now() - stats.mtimeMs > installLockStaleMs
            && await rmdir(lockPath).then(() => true, () => false)) {
            continue;
          }
          if (expired) {
            return unlocked;
          }
          await sleep(installLockPollMs);
          continue;
        }
        // Keep the mtime fresh so waiters do not mistake a slow install (a cold
        // `npm install -g` can take minutes) for a crashed owner.
        const heartbeat = installLockHeartbeatMs > 0
          ? setInterval(() => {
            const stamp = new Date();
            Promise.resolve(utimes(lockPath, stamp, stamp)).catch(() => {});
          }, installLockHeartbeatMs)
          : null;
        heartbeat?.unref?.();
        let released = false;
        return {
          acquired: true,
          release: async () => {
            if (released) {
              return;
            }
            released = true;
            if (heartbeat) {
              clearInterval(heartbeat);
            }
            await rmdir(lockPath).catch(() => {});
          }
        };
      }
    };

    const withInstallLock = async (lockPath, run) => {
      const lock = await acquireInstallLock(lockPath);
      try {
        return await run(lock.acquired);
      } finally {
        await lock.release();
      }
    };

    const formatInstallFailure = (error) => {
      const output = [error?.stderr, error?.stdout]
        .filter(value => typeof value === 'string' && value.trim())
        .join('\n')
        .trim();
      return output || error?.message || String(error);
    };

    const getInstallErrorText = (error) => [
      error?.stderr,
      error?.stdout,
      error?.message,
      error?.cause?.stderr,
      error?.cause?.stdout,
      error?.cause?.message
    ].filter(value => typeof value === 'string' && value.trim()).join('\n');

    const getOwnedConflictingBinPath = async ({ error, alias, packageName, globalModulesPath }) => {
      const errorText = getInstallErrorText(error);
      const pathMatch = errorText.match(/(?:^|\n)npm error path ([^\r\n]+)/);
      if (!/\bEEXIST\b/.test(errorText) || !pathMatch) {
        return null;
      }

      const binPath = pathMatch[1].trim();
      try {
        const linkTarget = await readlink(binPath);
        const resolvedTarget = path.resolve(path.dirname(binPath), linkTarget);
        const relativeTarget = path.relative(globalModulesPath, resolvedTarget);
        if (!relativeTarget
          || path.isAbsolute(relativeTarget)
          || relativeTarget === '..'
          || relativeTarget.startsWith(`..${path.sep}`)) {
          return null;
        }

        const [ownerAlias] = relativeTarget.split(path.sep);
        const aliasPrefix = `${packageName.replace('@', '').replace('/', '-')}-v-`;
        if (ownerAlias === alias || !ownerAlias.startsWith(aliasPrefix)) {
          return null;
        }

        const ownerPackageJson = JSON.parse(
          await readFile(path.join(globalModulesPath, ownerAlias, 'package.json'), 'utf8')
        );
        return ownerPackageJson.name === packageName ? binPath : null;
      } catch {
        return null;
      }
    };

    const installPackage = async ({ alias, packageName, version, packagePath, installContext, exclusive }) => {
      const failures = [];
      for (let attempt = 1; attempt <= installMaxAttempts; attempt++) {
        try {
          debug(1, `installing ${packageName}@${version} (attempt ${attempt}/${installMaxAttempts})`);
          await execAsync(
            `npm install -g ${quoteNpmArgument(`${alias}@npm:${packageName}@${version}`)}`,
            { env: installContext.env }
          );
          debug(1, `installed ${packageName}@${version} as ${alias}`);
          return;
        } catch (error) {
          let failure = error;
          let details = formatInstallFailure(error);
          const conflictingBinPath = await getOwnedConflictingBinPath({
            error,
            alias,
            packageName,
            globalModulesPath: installContext.globalModulesPath
          });
          if (conflictingBinPath) {
            try {
              await execAsync(
                `npm install -g --force --no-bin-links ${quoteNpmArgument(`${alias}@npm:${packageName}@${version}`)}`,
                { env: installContext.env }
              );
              return;
            } catch (retryError) {
              failure = retryError;
              details += `\nSafe no-bin retry after verified conflict at '${conflictingBinPath}': ${formatInstallFailure(retryError)}`;
            }
          }
          failures.push({ error: failure, details });
          // Removing the shared alias is only safe while we hold its lock.
          // Without the lock this deletes the tree a concurrent installer just
          // wrote successfully, which is what turned a failed install of one
          // caller into an ERR_MODULE_NOT_FOUND of another (issue #70).
          if (exclusive) {
            await removePackageAlias(packagePath, 'incomplete');
          }
          if (attempt < installMaxAttempts && installRetryDelayMs > 0) {
            debug(1, `npm install attempt ${attempt}/${installMaxAttempts} failed; retrying (${details})`);
            await sleep(installRetryDelayMs * attempt);
          }
        }
      }

      const attempts = failures
        .map(({ details }, index) => `  - ${index + 1}/${installMaxAttempts}: ${details}`)
        .join('\n');
      const cause = failures[failures.length - 1]?.error;
      throw new Error(
        `Failed to install ${packageName}@${version} globally into '${installContext.globalModulesPath}' after ${installMaxAttempts} attempts.\n` +
        `Attempts:\n${attempts}`,
        { cause }
      );
    };

    const resolveInstalledPackagePath = async ({ packageName, version, alias, repair }) => {
      const globalModulesPath = await getNpmGlobalRoot(baseNpmEnv);
      const packagePath = path.join(globalModulesPath, alias);
      const latestVersion = engineAware
        ? await getCompatibleVersion(packageName, baseNpmEnv, packagePath)
        : version === 'latest' ? await getLatestVersion(packageName, baseNpmEnv, packagePath) : null;
      if (!repair && await isPackageInstalled(
        packagePath,
        version,
        latestVersion,
        getInstallMarkerPath(globalModulesPath, alias)
      )) {
        debug(1, `reusing installed alias ${alias} from ${globalModulesPath}`);
        return packagePath;
      }

      const installContext = await getWritableInstallContext(globalModulesPath, baseNpmEnv);
      const installPath = path.join(installContext.globalModulesPath, alias);
      const markerPath = getInstallMarkerPath(installContext.globalModulesPath, alias);
      if (!repair
        && installContext.globalModulesPath !== globalModulesPath
        && await isPackageInstalled(installPath, version, latestVersion, markerPath)) {
        debug(1, `reusing cached npm alias ${alias} from ${installContext.globalModulesPath}`);
        return installPath;
      }

      return withInstallLock(getInstallLockPath(installContext.globalModulesPath, alias), async (exclusive) => {
        // Re-check while holding the lock: a peer we queued behind may have
        // installed the alias already, and an unmarked alias can only be
        // adopted here, where nothing else is writing to it.
        if (!repair && await isPackageInstalled(installPath, version, latestVersion, markerPath, { adopt: true })) {
          debug(1, `adopted existing npm alias ${alias} from ${installContext.globalModulesPath}`);
          return installPath;
        }
        await removeInstallMarker(markerPath);
        if (repair && await directoryExists(installPath)) {
          await removePackageAlias(installPath, 'corrupt');
        }
        // Install the exact version returned by metadata lookup. Otherwise the
        // `latest` tag could move between lookup and install, leaving the cache
        // marker immediately stale and triggering a reinstall on every call.
        const versionToInstall = latestVersion || version;
        await installPackage({ alias, packageName, version: versionToInstall, packagePath: installPath, installContext, exclusive });
        await writeInstallMarker(markerPath, {
          alias,
          version: await getInstalledPackageVersion(installPath),
          requestedVersion: version
        });
        return installPath;
      });
    };

    // Collapse the concurrent callers of one alias inside this process: identical
    // requests share a single install, and an install and a repair of the same
    // alias are serialized instead of overlapping. Without this every `use()` in
    // a cold top-level-await wave starts its own `npm install -g` (issue #70).
    const ensurePackageInstalled = async ({ packageName, version }, { repair = false } = {}) => {
      const aliasVersion = npmSemver.validRange(version) && !npmSemver.valid(version)
        ? `range-${createHash('sha256').update(version).digest('hex').slice(0, 16)}` : version;
      const alias = `${packageName.replace('@', '').replace('/', '-')}-v-${aliasVersion}`;
      const aliasKey = `${getNpmEnvId(npmEnvSource)}\0${alias}`;
      const requestKey = `${aliasKey}\0${engineAware ? 'engines' : 'unchecked'}${repair ? '\0repair' : ''}`;
      return dedupeNpmInstall(
        requestKey,
        aliasKey,
        () => resolveInstalledPackagePath({ packageName, version, alias, repair })
      );
    };

    const resolvePackageModule = async (packagePath) => {
      const packageJsonPath = path.join(packagePath, 'package.json');
      if (await fileExists(packageJsonPath)) {
        const parsed = JSON.parse(await readFile(packageJsonPath, 'utf8'));
        if (Object.prototype.hasOwnProperty.call(parsed, 'exports')) {
          const packageSubpath = modulePath ? `.${modulePath}` : '.';
          const target = resolvePackageExportTarget(parsed.exports, packageSubpath);
          if (target === unresolvedPackageExport || target === null) {
            throw new Error(`Package subpath '${packageSubpath}' is not exported by '${packageJsonPath}'.`);
          }
          if (typeof target !== 'string' || !target.startsWith('./')) {
            throw new Error(`Invalid package exports target '${target}' for '${packageSubpath}' in '${packageJsonPath}'.`);
          }
          const packageExportPath = path.resolve(packagePath, target);
          const relativeExportPath = path.relative(packagePath, packageExportPath);
          if (path.isAbsolute(relativeExportPath)
            || relativeExportPath === '..'
            || relativeExportPath.startsWith(`..${path.sep}`)) {
            throw new Error(`Package exports target '${target}' for '${packageSubpath}' escapes '${packagePath}'.`);
          }
          const resolvedExportPath = await tryResolveModule(packageExportPath);
          if (!resolvedExportPath) {
            throw new Error(`Failed to resolve package export '${packageSubpath}' from '${packageExportPath}'.`);
          }
          return resolvedExportPath;
        }
      }

      const packageModulePath = modulePath ? path.join(packagePath, modulePath) : packagePath;
      const resolvedPath = await tryResolveModule(packageModulePath);
      if (!resolvedPath) {
        throw new Error(`Failed to resolve the path to '${moduleSpecifier}' from '${packageModulePath}'.`);
      }
      return resolvedPath;
    };

    let packagePath = await ensurePackageInstalled(
      { packageName, version },
      { repair: Boolean(options?.repair) }
    );
    try {
      return await resolvePackageModule(packagePath);
    } catch (error) {
      if (options?.repair || modulePath) {
        throw error;
      }
      packagePath = await ensurePackageInstalled({ packageName, version }, { repair: true });
      return resolvePackageModule(packagePath);
    }
  },
  bun: async (moduleSpecifier, pathResolver) => {
    const path = await import('node:path');
    const { exec } = await import('node:child_process');
    const { promisify } = await import('node:util');
    const { stat, readFile } = await import('node:fs/promises');
    const execAsync = promisify(exec);

    if (!pathResolver) {
      throw new Error('Failed to get the current resolver.');
    }

    const fileExists = async (filePath) => {
      try {
        const stats = await stat(filePath);
        return stats.isFile();
      } catch (error) {
        if (error.code !== 'ENOENT') {
          throw error;
        }
        return false;
      }
    };

    const directoryExists = async (directoryPath) => {
      try {
        const stats = await stat(directoryPath);
        return stats.isDirectory();
      } catch (error) {
        if (error.code !== 'ENOENT') {
          throw error;
        }
        return false;
      }
    };

    const tryResolveModule = async (packagePath) => {
      try {
        return await pathResolver(packagePath);
      } catch (error) {
        if (error.code !== 'MODULE_NOT_FOUND') {
          throw new Error(`Failed to resolve module '${packagePath}'`, { cause: error });
        }

        if (await directoryExists(packagePath)) {
          const directoryName = path.basename(packagePath);
          const resolvedPath = await tryResolveModule(path.join(packagePath, directoryName));
          if (resolvedPath) {
            return resolvedPath;
          }

          const packageJsonPath = path.join(packagePath, 'package.json');
          if (await fileExists(packageJsonPath)) {
            const packageJson = await readFile(packageJsonPath, 'utf8');
            const parsed = JSON.parse(packageJson);
            if (Object.prototype.hasOwnProperty.call(parsed, 'exports')) {
              const target = resolvePackageExportTarget(parsed.exports, '.');
              if (typeof target === 'string' && target.startsWith('./')) {
                const updatedPath = path.resolve(packagePath, target);
                return await tryResolveModule(updatedPath);
              }
            }
          }

          return null;
        }

        return null;
      }
    };

    const ensurePackageInstalled = async ({ packageName, version }) => {
      const alias = `${packageName.replace('@', '').replace('/', '-')}-v-${version}`;

      let binDir = '';
      try {
        const { stdout } = await execAsync('bun pm bin -g');
        binDir = stdout.trim();
      } catch (error) {
        // In CI or fresh environments, the global directory might not exist
        // Try to get the default Bun install path
        try {
          const os = await import('node:os');
          const home = os.homedir();
          binDir = path.join(home, '.bun', 'bin');
        } catch (osError) {
          throw new Error('Unable to determine Bun global directory.', { cause: error });
        }
      }

      const bunInstallRoot = path.resolve(binDir, '..');
      const globalModulesPath = path.join(bunInstallRoot, 'install', 'global', 'node_modules');
      const packagePath = path.join(globalModulesPath, alias);

      if (version !== 'latest' && await directoryExists(packagePath)) {
        return packagePath;
      }

      try {
        await execAsync(`bun add -g ${alias}@npm:${packageName}@${version} --silent`, { stdio: 'ignore' });
      } catch (error) {
        throw new Error(`Failed to install ${packageName}@${version} globally with Bun.`, { cause: error });
      }

      return packagePath;
    };

    const { packageName, version, modulePath } = parseModuleSpecifier(moduleSpecifier);
    const packagePath = await ensurePackageInstalled({ packageName, version });
    const packageJsonPath = path.join(packagePath, 'package.json');
    if (await fileExists(packageJsonPath)) {
      const parsed = JSON.parse(await readFile(packageJsonPath, 'utf8'));
      if (Object.prototype.hasOwnProperty.call(parsed, 'exports')) {
        const packageSubpath = modulePath ? `.${modulePath}` : '.';
        const target = resolvePackageExportTarget(parsed.exports, packageSubpath);
        if (target === unresolvedPackageExport || target === null) {
          throw new Error(`Package subpath '${packageSubpath}' is not exported by '${packageJsonPath}'.`);
        }
        if (typeof target !== 'string' || !target.startsWith('./')) {
          throw new Error(`Invalid package exports target '${target}' for '${packageSubpath}' in '${packageJsonPath}'.`);
        }
        const packageExportPath = path.resolve(packagePath, target);
        const relativeExportPath = path.relative(packagePath, packageExportPath);
        if (path.isAbsolute(relativeExportPath)
          || relativeExportPath === '..'
          || relativeExportPath.startsWith(`..${path.sep}`)) {
          throw new Error(`Package exports target '${target}' for '${packageSubpath}' escapes '${packagePath}'.`);
        }
        const resolvedExportPath = await tryResolveModule(packageExportPath);
        if (!resolvedExportPath) {
          throw new Error(`Failed to resolve package export '${packageSubpath}' from '${packageExportPath}'.`);
        }
        return resolvedExportPath;
      }
    }

    const packageModulePath = modulePath ? path.join(packagePath, modulePath) : packagePath;
    const resolvedPath = await tryResolveModule(packageModulePath);
    if (!resolvedPath) {
      throw new Error(`Failed to resolve the path to '${moduleSpecifier}' from '${packageModulePath}'.`);
    }
    return resolvedPath;
  },
  deno: async (moduleSpecifier, pathResolver) => {
    const { packageName, version, modulePath } = parseModuleSpecifier(moduleSpecifier);

    // Use esm.sh as the default CDN for Deno, which provides good Deno compatibility
    const resolvedPath = `https://esm.sh/${packageName}@${version}${modulePath}`;
    return resolvedPath;
  },
  denoNpm: async (moduleSpecifier) => {
    const { packageName, version, modulePath } = parseModuleSpecifier(moduleSpecifier);
    return `npm:${packageName}@${version}${modulePath}`;
  },
  skypack: async (moduleSpecifier, pathResolver) => {
    const resolvedPath = `https://cdn.skypack.dev/${moduleSpecifier}`;
    return resolvedPath;
  },
  jsdelivr: async (moduleSpecifier, pathResolver) => {
    const { packageName, version, modulePath } = parseModuleSpecifier(moduleSpecifier);
    // If no modulePath is provided, append /{packageName}.js
    let path = modulePath ? modulePath : `/${packageName}`;
    if (/\.(mc)?js$/.test(path) === false) {
      path += '.js';
    }
    const resolvedPath = `https://cdn.jsdelivr.net/npm/${packageName}-es@${version}${path}`;
    return resolvedPath;
  },
  unpkg: async (moduleSpecifier, pathResolver) => {
    const { packageName, version, modulePath } = parseModuleSpecifier(moduleSpecifier);
    // If no modulePath is provided, append /{packageName}.js
    let path = modulePath ? modulePath : `/${packageName}`;
    if (/\.(mc)?js$/.test(path) === false) {
      path += '.js';
    }
    const resolvedPath = `https://unpkg.com/${packageName}-es@${version}${path}`;
    return resolvedPath;
  },
  esm: async (moduleSpecifier, pathResolver) => {
    const resolvedPath = `https://esm.sh/${moduleSpecifier}`;
    return resolvedPath;
  },
  jspm: async (moduleSpecifier, pathResolver) => {
    let { packageName, version, modulePath } = parseModuleSpecifier(moduleSpecifier);
    if (version === 'latest') {
      version = '';
    }
    const resolvedPath = `https://jspm.dev/${packageName}${version ? `@${version}` : ''}${modulePath}`;
    return resolvedPath;
  },
}

// Source fragment: resolver chains and concurrent npm install coordination.
// Generated bundles concatenate this file; do not import it directly.

// Ordered chains of universal-ESM CDN resolvers tried for network/CDN loading.
// Each entry is a key into `resolvers`; the chains list *distinct* CDN hosts so a
// single CDN outage no longer breaks `use()` — when the first host fails we fall
// back to the next.
const networkResolverChain = ['esm', 'jspm', 'skypack']
// Prefer Deno's integrity-checked npm packages over mutable CDN transforms.
const denoResolverChain = ['denoNpm', 'deno', 'jspm', 'skypack']

// npm installs for the same alias must not overlap. `npm install -g` takes no
// lock on the global prefix, so two runs writing the same alias directory delete
// and re-extract each other's trees — the loser fails with ENOTEMPTY, and, worse,
// a caller that saw no error at all can import a half-written tree. Node
// evaluates sibling top-level-await subgraphs concurrently, so a project whose
// modules all open with `await use('some-package')` starts exactly that wave on
// every cold run (issue #70). These maps collapse the wave inside one process;
// the alias lock in the npm resolver covers separate processes.
const npmInstallsInFlight = new Map()
const npmInstallQueues = new Map()
const npmLatestVersionMemoryCache = new Map()
const npmEnvIds = new WeakMap()
let npmEnvId = 0

// A stable id per npm environment object. Calls that share an environment (the
// usual `process.env`) share coordination keys, while calls given explicitly
// different environments — different npm prefixes, hence different install
// directories — never collapse into each other.
const getNpmEnvId = (env) => {
  if (!env || typeof env !== 'object') {
    return 'env-default'
  }
  let id = npmEnvIds.get(env)
  if (id === undefined) {
    id = `env-${++npmEnvId}`
    npmEnvIds.set(env, id)
  }
  return id
}

// Serialize every install of one alias in this process, so an install and a
// repair of the same directory can never run at the same time.
const queueNpmInstall = (aliasKey, run) => {
  const previous = npmInstallQueues.get(aliasKey) || Promise.resolve()
  const result = previous.then(run, run)
  const tail = result.then(() => {}, () => {})
  npmInstallQueues.set(aliasKey, tail)
  tail.then(() => {
    if (npmInstallQueues.get(aliasKey) === tail) {
      npmInstallQueues.delete(aliasKey)
    }
  })
  return result
}

// Single flight: identical concurrent requests share one install. The entry is
// evicted once it settles, so a genuine failure stays retryable.
const dedupeNpmInstall = (requestKey, aliasKey, run) => {
  const pending = npmInstallsInFlight.get(requestKey)
  if (pending) {
    return pending
  }
  const promise = queueNpmInstall(aliasKey, run)
  npmInstallsInFlight.set(requestKey, promise)
  const forget = () => {
    if (npmInstallsInFlight.get(requestKey) === promise) {
      npmInstallsInFlight.delete(requestKey)
    }
  }
  promise.then(forget, forget)
  return promise
}

let npmImportRecoveryId = 0

const isRecoverableNpmImportError = (error, modulePath) => {
  if (error?.message !== `Failed to import module from '${modulePath}'.`) {
    return false
  }
  const cause = error.cause
  return cause?.name === 'SyntaxError' ||
    cause?.code === 'ERR_INVALID_PACKAGE_CONFIG' ||
    cause?.code === 'ERR_MODULE_NOT_FOUND'
}

const cacheBustNpmModulePath = async (modulePath) => {
  const { pathToFileURL } = await import('node:url')
  const moduleUrl = pathToFileURL(modulePath)
  moduleUrl.searchParams.set('use-m-retry', String(++npmImportRecoveryId))
  return moduleUrl.href
}

// Normalize a resolver reference (a resolver function, or a key into `resolvers`)
// into a resolver function.
const toResolverFunction = (resolver) =>
  typeof resolver === 'function' ? resolver : resolvers[resolver]

// Source fragment: fallback loading and the public use()/makeUse() runtime.
// Generated bundles concatenate this file; do not import it directly.

// Generic, mechanism-agnostic "try sources in order until one works" engine.
// Tries each `source` in order (optionally retrying each `maxAttemptsPerSource`
// times with linear backoff) and returns the first successful `load(source,
// attempt)` result. If every attempt fails it throws ONE clear, aggregated error
// listing every attempt — never just the cryptic last failure (issue #58).
//
// This is the shared core reused by both resilient per-package CDN imports (see
// `makeUse` below) and the use-m bootstrap loader (`loadUseM` in load.mjs /
// load.cjs), so retry/fallback behaves identically everywhere it is used.
//
// @param {Array<unknown>} sources - ordered list of things to try (URLs, resolver keys, ...)
// @param {(source: unknown, attempt: number) => Promise<any>} load - loads one source; throws on failure
// @param {object} [options]
// @param {number} [options.maxAttemptsPerSource] - attempts per source (default 1)
// @param {number} [options.retryDelayMs] - base delay between retries, linear backoff (default 0)
// @param {(source: unknown) => string} [options.describeSource] - human label for a source in errors
// @param {string} [options.label] - what we were trying to do (used in the error message)
// @param {string} [options.hint] - extra guidance appended to the aggregated error
const loadWithFallback = async (sources, load, options = {}) => {
  const {
    maxAttemptsPerSource = 1,
    retryDelayMs = 0,
    describeSource = (source) => String(source),
    label = 'load from any source',
    hint = '',
  } = options
  if (!Array.isArray(sources) || sources.length === 0) {
    throw new Error(`Failed to ${label}: no sources were provided.`)
  }
  if (typeof load !== 'function') {
    throw new Error(`Failed to ${label}: a load function is required.`)
  }
  const failures = []
  for (const source of sources) {
    for (let attempt = 1; attempt <= maxAttemptsPerSource; attempt++) {
      try {
        return await load(source, attempt)
      } catch (error) {
        const reason = error && error.message ? error.message : String(error)
        failures.push(`${describeSource(source)} (attempt ${attempt}/${maxAttemptsPerSource}): ${reason}`)
        if (attempt < maxAttemptsPerSource && retryDelayMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, retryDelayMs * attempt))
        }
      }
    }
  }
  throw new Error(
    `Failed to ${label}.${hint ? ' ' + hint : ''}\nAttempts:\n  - ` + failures.join('\n  - ')
  )
}

const baseUse = async (modulePath) => {
  // Dynamically import the module
  try {
    const importSpecifier = nativeWindowsPathToFileUrl(modulePath);
    const isJsonModule = /\.json(?:[?#].*)?$/i.test(modulePath);
    const module = isJsonModule
      ? await import(importSpecifier, { with: { type: 'json' } })
      : await import(importSpecifier);

    // More robust default export handling for cross-environment compatibility
    const keys = Object.keys(module);

    // If it's a Module object with a default property, unwrap it
    if (module.default !== undefined) {
      // Check if this is likely a CommonJS module with only default export
      if (keys.length === 1 && keys[0] === 'default') {
        return module.default;
      }

      // Check if default is the main export and other keys are just function/module metadata
      const metadataKeys = new Set([
        'default', '__esModule', 'Symbol(Symbol.toStringTag)',
        'length', 'name', 'prototype', 'constructor',
        'toString', 'valueOf', 'hasOwnProperty', 'isPrototypeOf', 'propertyIsEnumerable'
      ]);
      if (module.default === module['module.exports']) {
        metadataKeys.add('module.exports');
      }

      const nonMetadataKeys = keys.filter(key => !metadataKeys.has(key));

      // If there are no significant non-metadata keys, return the default
      if (nonMetadataKeys.length === 0) {
        return module.default;
      }
    }

    // Return the whole module if it has multiple meaningful exports or no default
    return module;
  } catch (error) {
    // Deno's npm ESM imports require file extensions for legacy subpaths that
    // Node resolves automatically. Honor its explicit .js suggestion while
    // leaving package export maps and unrelated import errors unchanged.
    if (typeof Deno !== 'undefined' && modulePath.startsWith('npm:') && !modulePath.endsWith('.js') &&
        error.code === 'ERR_MODULE_NOT_FOUND' &&
        error.message.includes('Did you mean to import with the ".js" extension?') &&
        parseModuleSpecifier(modulePath.slice(4)).modulePath) {
      return baseUse(`${modulePath}.js`);
    }
    throw new Error(`Failed to import module from '${modulePath}'.`, { cause: error });
  }
}

const makeUse = async (options) => {
  let scriptPath = options?.scriptPath;
  const hasBrowserGlobals = typeof window !== 'undefined' && typeof document !== 'undefined';
  if (!scriptPath && !hasBrowserGlobals && typeof global !== 'undefined' && typeof global['__filename'] !== 'undefined') {
    scriptPath = global['__filename'];
  }
  const metaUrl = options?.meta?.url;
  if (!scriptPath && metaUrl) {
    scriptPath = metaUrl;
  }
  if (!scriptPath) {
    scriptPath = import.meta.url;
  }
  scriptPath = nativeWindowsPathToFileUrl(scriptPath);
  let protocol;
  if (scriptPath) {
    try {
      protocol = new URL(scriptPath).protocol;
    } catch {
      // If scriptPath is a local file path, convert it to file:// URL
      if (scriptPath.startsWith('/') || scriptPath.includes('\\')) {
        protocol = 'file:';
      }
    }
  }
  // Build the ordered chain of specifier resolvers to try. A single-entry chain
  // means "no fallback": an explicit user choice (function or name) and the local
  // npm/bun runtimes import exactly as before. The browser/HTTP and Deno network
  // defaults use a multi-host chain so a CDN outage falls back instead of failing.
  // `import` is an injectable low-level importer (defaults to baseUse) used for
  // dependency injection in tests and advanced setups.
  const importModule = typeof options?.import === 'function' ? options.import : baseUse;
  let resolverChain;
  if (Array.isArray(options?.specifierResolvers) && options.specifierResolvers.length > 0) {
    resolverChain = options.specifierResolvers;
  } else if (typeof options?.specifierResolver === 'function' || options?.specifierResolver) {
    resolverChain = [options.specifierResolver];
  } else {
    const isDenoRuntime = typeof Deno !== 'undefined';
    const isBunRuntime = typeof Bun !== 'undefined';
    const isBrowserRuntime = !isDenoRuntime && !isBunRuntime && hasBrowserGlobals;
    const isNodeRuntime = !isDenoRuntime && !isBunRuntime && !isBrowserRuntime && typeof process !== 'undefined' && Boolean(process.versions?.node);
    if (isBrowserRuntime || (protocol && (protocol === 'http:' || protocol === 'https:'))) {
      resolverChain = networkResolverChain;
    } else if (isDenoRuntime) {
      resolverChain = denoResolverChain;
    } else if (isBunRuntime) {
      resolverChain = ['bun'];
    } else {
      resolverChain = ['npm'];
    }
  }
  let pathResolver = options?.pathResolver;
  if (!pathResolver) {
    const isCJS = typeof module !== "undefined" && !!module.exports;
    const hasRequire = typeof require !== 'undefined';
    const hasScriptPath = scriptPath && (!protocol || protocol === 'file:');
    if (hasRequire && hasScriptPath) {
      if (isCJS) {
        pathResolver = require.resolve;
      } else {
        pathResolver = await import('node:module')
        .then(module => module.createRequire(scriptPath))
        .then(require => require.resolve);
      }
    } else if (hasRequire) {
      pathResolver = require.resolve;
    } else if (hasScriptPath) {
      pathResolver = await import('node:module')
        .then(module => module.createRequire(scriptPath))
        .then(require => require.resolve);
    } else {
      pathResolver = (path) => path;
    }
  }
  return async (moduleSpecifier, providedCallerContext) => {
    const stack = new Error().stack;
    const resolverOptions = providedCallerContext && typeof providedCallerContext === 'object'
      ? { ...(options || {}), ...providedCallerContext } : options;

    // Use provided caller context or try to capture it from stack trace
    const callerContext = (typeof providedCallerContext === 'string' ? providedCallerContext : null) || extractCallerContext(stack);

    // Always try built-in resolver first
    const builtinModule = await resolvers.builtin(moduleSpecifier, pathResolver);
    if (builtinModule) {
      return builtinModule;
    }

    // Try relative path resolver second (for ./, ../, ../../, etc.)
    const relativeModule = await resolvers.relative(moduleSpecifier, pathResolver, callerContext);
    if (relativeModule) {
      return relativeModule;
    }

    // If not a built-in or relative module, resolve + import via the configured
    // resolver chain. A single-entry chain imports directly (preserving the
    // original behavior and error); a multi-entry chain falls back across CDN
    // mirrors via the shared loadWithFallback engine.
    if (resolverChain.length === 1) {
      const resolver = resolverChain[0];
      const resolverFunction = toResolverFunction(resolver);
      const modulePath = await resolverFunction(moduleSpecifier, pathResolver, resolverOptions);
      try {
        return await importModule(modulePath);
      } catch (error) {
        if (resolver !== 'npm' || !isRecoverableNpmImportError(error, modulePath)) {
          throw error;
        }
        const repairedModulePath = await resolverFunction(
          moduleSpecifier,
          pathResolver,
          { ...(resolverOptions || {}), repair: true }
        );
        return importModule(await cacheBustNpmModulePath(repairedModulePath));
      }
    }
    return loadWithFallback(
      resolverChain,
      async (resolver) => {
        const modulePath = await toResolverFunction(resolver)(moduleSpecifier, pathResolver);
        return importModule(modulePath);
      },
      {
        label: `import '${moduleSpecifier}' from any CDN mirror`,
        describeSource: (resolver) => (typeof resolver === 'function' ? 'custom resolver' : String(resolver)),
      }
    );
  };
}

let __usePromise = null;
const use = async (moduleSpecifier, options) => {
  const stack = new Error().stack;

  // For Bun, we need to capture the stack trace before any other calls
  let bunCallerContext = null;
  if (typeof Bun !== 'undefined') {
    if (stack) {
      const lines = stack.split('\n');
      // Look for any .mjs file that's not use.mjs. Bun stack traces can use
      // either POSIX paths or native Windows drive-letter/UNC paths.
      for (const line of lines) {
        const match = line.match(/[(]?((?:\/|[A-Za-z]:[\\/]|\\\\)[^)\n]+?\.m?js)(?::\d+:\d+)?\)?/);
        if (match && !match[1].replaceAll('\\', '/').endsWith('/use.mjs')) {
          bunCallerContext = absolutePathToFileUrl(match[1]);
          break;
        }
      }
    }
  }

  // Capture the caller context here, before entering makeUse
  const callerContext = bunCallerContext || extractCallerContext(stack);

  if (options && typeof options === 'object') {
    const useInstance = await makeUse(options);
    return useInstance(moduleSpecifier, callerContext);
  }
  if (!__usePromise) {
    __usePromise = makeUse();
  }
  const useInstance = await __usePromise;
  return useInstance(moduleSpecifier, callerContext);
}
use.all = async (...moduleSpecifiers) => {
  if (!__usePromise) {
    __usePromise = makeUse();
  }
  const useInstance = await __usePromise;
  return Promise.all(moduleSpecifiers.map(useInstance));
}

export { parseModuleSpecifier, resolvers, makeUse, baseUse, loadWithFallback, networkResolverChain, denoResolverChain, use };
