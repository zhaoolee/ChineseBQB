'use strict';

const Promise = require('bluebird');
const fs = require('graceful-fs');
const { dirname, join, extname, basename } = require('path');
const chokidar = require('chokidar');
const escapeRegExp = require('escape-string-regexp');

const rEOL = /\r\n/g;

const statAsync = Promise.promisify(fs.stat);
const readdirAsync = Promise.promisify(fs.readdir);
const unlinkAsync = Promise.promisify(fs.unlink);
const mkdirAsync = Promise.promisify(fs.mkdir);
const writeFileAsync = Promise.promisify(fs.writeFile);
const appendFileAsync = Promise.promisify(fs.appendFile);
const rmdirAsync = Promise.promisify(fs.rmdir);
const readFileAsync = Promise.promisify(fs.readFile);
const createReadStream = fs.createReadStream;
const createWriteStream = fs.createWriteStream;
const accessSync = fs.accessSync;
const accessAsync = Promise.promisify(fs.access);

function exists(path, callback) {
  if (!path) throw new TypeError('path is required!');

  return accessAsync(path).then(() => true, () => false).then(exist => {
    if (typeof callback === 'function') callback(exist);
    return exist;
  });
}

function existsSync(path) {
  if (!path) throw new TypeError('path is required!');

  try {
    fs.accessSync(path);
  } catch (err) {
    return false;
  }

  return true;
}

function mkdirs(path, callback) {
  if (!path) throw new TypeError('path is required!');

  const parent = dirname(path);

  return exists(parent).then(exist => {
    if (!exist) return mkdirs(parent);
  }).then(() => mkdirAsync(path)).catch(err => {
    if (err.cause.code !== 'EEXIST') throw err;
  }).asCallback(callback);
}

function mkdirsSync(path) {
  if (!path) throw new TypeError('path is required!');

  const parent = dirname(path);
  const exist = fs.existsSync(parent);

  if (!exist) mkdirsSync(parent);
  fs.mkdirSync(path);
}

function checkParent(path) {
  if (!path) throw new TypeError('path is required!');

  const parent = dirname(path);

  return exists(parent).then(exist => {
    if (!exist) return mkdirs(parent);
  });
}

function checkParentSync(path) {
  if (!path) throw new TypeError('path is required!');

  const parent = dirname(path);
  const exist = fs.existsSync(parent);

  if (exist) return;

  try {
    mkdirsSync(parent);
  } catch (err) {
    if (err.code !== 'EEXIST') throw err;
  }
}

function writeFile(path, data, options, callback) {
  if (!path) throw new TypeError('path is required!');

  if (!callback && typeof options === 'function') {
    callback = options;
    options = {};
  }

  return checkParent(path).then(() => writeFileAsync(path, data, options)).asCallback(callback);
}

function writeFileSync(path, data, options) {
  if (!path) throw new TypeError('path is required!');

  checkParentSync(path);
  fs.writeFileSync(path, data, options);
}

function appendFile(path, data, options, callback) {
  if (!path) throw new TypeError('path is required!');

  if (!callback && typeof options === 'function') {
    callback = options;
    options = {};
  }

  return checkParent(path).then(() => appendFileAsync(path, data, options)).asCallback(callback);
}

function appendFileSync(path, data, options) {
  if (!path) throw new TypeError('path is required!');

  checkParentSync(path);
  fs.appendFileSync(path, data, options);
}

const _copyFile = fs.copyFile ? Promise.promisify(fs.copyFile) : (src, dest) => new Promise((resolve, reject) => {
  const rs = createReadStream(src);
  const ws = createWriteStream(dest);

  rs.pipe(ws).on('error', reject);

  ws.on('close', resolve).on('error', reject);
});

function copyFile(src, dest, flags, callback) {
  if (!src) throw new TypeError('src is required!');
  if (!dest) throw new TypeError('dest is required!');
  if (typeof flags === 'function') {
    callback = flags;
  }

  return checkParent(dest).then(() => _copyFile(src, dest, flags)).asCallback(callback);
}

function trueFn() {
  return true;
}

function ignoreHiddenFiles(ignore) {
  if (!ignore) return trueFn;

  return item => item[0] !== '.';
}

function ignoreFilesRegex(regex) {
  if (!regex) return trueFn;

  return item => !regex.test(item);
}

function ignoreExcludeFiles(arr, parent) {
  if (!arr || !arr.length) return trueFn;

  // Build a map to make it faster.
  const map = {};

  for (let i = 0, len = arr.length; i < len; i++) {
    map[arr[i]] = true;
  }

  return item => {
    const path = join(parent, item.path);
    return !map[path];
  };
}

function reduceFiles(result, item) {
  if (Array.isArray(item)) {
    return result.concat(item);
  }

  result.push(item);
  return result;
}

function _readAndFilterDir(path, options) {
  return readdirAsync(path)
    .filter(ignoreHiddenFiles(options.ignoreHidden == null ? true : options.ignoreHidden))
    .filter(ignoreFilesRegex(options.ignorePattern))
    .map(item => {
      const fullPath = join(path, item);

      return statAsync(fullPath).then(stats => ({
        isDirectory: stats.isDirectory(),
        path: item,
        fullPath
      }));
    });
}

function _readAndFilterDirSync(path, options) {
  return fs.readdirSync(path)
    .filter(ignoreHiddenFiles(options.ignoreHidden == null ? true : options.ignoreHidden))
    .filter(ignoreFilesRegex(options.ignorePattern))
    .map(item => {
      const fullPath = join(path, item);
      const stats = fs.statSync(fullPath);

      return {
        isDirectory: stats.isDirectory(),
        path: item,
        fullPath
      };
    });
}

function _copyDir(src, dest, options, parent) {
  return _readAndFilterDir(src, options)
    .map(item => {
      const childSrc = item.fullPath;
      const childDest = join(dest, item.path);
      const currentPath = join(parent, item.path);

      if (item.isDirectory) {
        return _copyDir(childSrc, childDest, options, currentPath);
      }

      return copyFile(childSrc, childDest, options).thenReturn(currentPath);
    }).reduce(reduceFiles, []);
}

function copyDir(src, dest, options = {}, callback) {
  if (!src) throw new TypeError('src is required!');
  if (!dest) throw new TypeError('dest is required!');

  if (!callback && typeof options === 'function') {
    callback = options;
    options = {};
  }

  return checkParent(dest).then(() => _copyDir(src, dest, options, '')).asCallback(callback);
}

function _listDir(path, options, parent) {
  return _readAndFilterDir(path, options).map(item => {
    const currentPath = join(parent, item.path);

    if (item.isDirectory) {
      return _listDir(item.fullPath, options, currentPath);
    }

    return currentPath;
  }).reduce(reduceFiles, []);
}

function listDir(path, options = {}, callback) {
  if (!path) throw new TypeError('path is required!');

  if (!callback && typeof options === 'function') {
    callback = options;
    options = {};
  }

  return _listDir(path, options, '').asCallback(callback);
}

function _listDirSync(path, options, parent) {
  return _readAndFilterDirSync(path, options).map(item => {
    const currentPath = join(parent, item.path);

    if (item.isDirectory) {
      return _listDirSync(item.fullPath, options, currentPath);
    }

    return currentPath;
  }).reduce(reduceFiles, []);
}

function listDirSync(path, options = {}) {
  if (!path) throw new TypeError('path is required!');

  return _listDirSync(path, options, '');
}

function escapeEOL(str) {
  return str.replace(rEOL, '\n');
}

function escapeBOM(str) {
  return str.charCodeAt(0) === 0xFEFF ? str.substring(1) : str;
}

function escapeFileContent(content) {
  return escapeBOM(escapeEOL(content));
}

function readFile(path, options = {}, callback) {
  if (!path) throw new TypeError('path is required!');

  if (!callback && typeof options === 'function') {
    callback = options;
    options = {};
  }

  if (!options.hasOwnProperty('encoding')) options.encoding = 'utf8';

  return readFileAsync(path, options).then(content => {
    if (options.escape == null || options.escape) {
      return escapeFileContent(content);
    }

    return content;
  }).asCallback(callback);
}

function readFileSync(path, options = {}) {
  if (!path) throw new TypeError('path is required!');

  if (!options.hasOwnProperty('encoding')) options.encoding = 'utf8';

  const content = fs.readFileSync(path, options);

  if (options.escape == null || options.escape) {
    return escapeFileContent(content);
  }

  return content;
}

function _emptyDir(path, options, parent) {
  return _readAndFilterDir(path, options)
    .filter(ignoreExcludeFiles(options.exclude, parent))
    .map(item => {
      const fullPath = item.fullPath;
      const currentPath = join(parent, item.path);

      if (item.isDirectory) {
        return _emptyDir(fullPath, options, currentPath).tap(() => readdirAsync(fullPath).then(files => {
          if (!files.length) return rmdirAsync(fullPath);
        }));
      }

      return unlinkAsync(fullPath).thenReturn(currentPath);
    }).reduce(reduceFiles, []);
}

function emptyDir(path, options = {}, callback) {
  if (!path) throw new TypeError('path is required!');

  if (!callback && typeof options === 'function') {
    callback = options;
    options = {};
  }

  return _emptyDir(path, options, '').asCallback(callback);
}

function _emptyDirSync(path, options, parent) {
  return _readAndFilterDirSync(path, options)
    .filter(ignoreExcludeFiles(options.exclude, parent))
    .map(item => {
      const childPath = item.fullPath;
      const currentPath = join(parent, item.path);

      if (item.isDirectory) {
        const removed = _emptyDirSync(childPath, options, currentPath);

        if (!fs.readdirSync(childPath).length) {
          rmdirSync(childPath);
        }

        return removed;
      }

      fs.unlinkSync(childPath);
      return currentPath;
    }).reduce(reduceFiles, []);
}

function emptyDirSync(path, options = {}) {
  if (!path) throw new TypeError('path is required!');

  return _emptyDirSync(path, options, '');
}

function _rmdir(path) {
  return readdirAsync(path).map(item => {
    const childPath = join(path, item);

    return statAsync(childPath).then(stats => {
      if (stats.isDirectory()) {
        return _rmdir(childPath);
      }

      return unlinkAsync(childPath);
    });
  }).then(() => rmdirAsync(path));
}

function rmdir(path, callback) {
  if (!path) throw new TypeError('path is required!');

  return _rmdir(path).asCallback(callback);
}

function _rmdirSync(path) {
  const files = fs.readdirSync(path);

  for (let i = 0, len = files.length; i < len; i++) {
    const childPath = join(path, files[i]);
    const stats = fs.statSync(childPath);

    if (stats.isDirectory()) {
      _rmdirSync(childPath);
    } else {
      fs.unlinkSync(childPath);
    }
  }

  fs.rmdirSync(path);
}

function rmdirSync(path) {
  if (!path) throw new TypeError('path is required!');

  _rmdirSync(path);
}

function watch(path, options, callback) {
  if (!path) throw new TypeError('path is required!');

  if (!callback && typeof options === 'function') {
    callback = options;
    options = {};
  }

  const watcher = chokidar.watch(path, options);

  return new Promise((resolve, reject) => {
    watcher.on('ready', resolve);
    watcher.on('error', reject);
  }).thenReturn(watcher).asCallback(callback);
}

function _findUnusedPath(path, files) {
  const ext = extname(path);
  const base = basename(path, ext);
  const regex = new RegExp(`^${escapeRegExp(base)}(?:-(\\d+))?${escapeRegExp(ext)}$`);
  let num = -1;

  for (let i = 0, len = files.length; i < len; i++) {
    const item = files[i];
    if (!regex.test(item)) continue;

    const match = item.match(regex);
    const matchNum = match[1] ? parseInt(match[1], 10) : 0;

    if (matchNum > num) {
      num = matchNum;
    }
  }

  return join(dirname(path), `${base}-${num + 1}${ext}`);
}

function ensurePath(path, callback) {
  if (!path) throw new TypeError('path is required!');

  return exists(path).then(exist => {
    if (!exist) return path;

    return readdirAsync(dirname(path)).then(files => _findUnusedPath(path, files));
  }).asCallback(callback);
}

function ensurePathSync(path) {
  if (!path) throw new TypeError('path is required!');
  if (!fs.existsSync(path)) return path;

  const files = fs.readdirSync(dirname(path));

  return _findUnusedPath(path, files);
}

function ensureWriteStream(path, options, callback) {
  if (!path) throw new TypeError('path is required!');

  if (!callback && typeof options === 'function') {
    callback = options;
    options = {};
  }

  return checkParent(path).then(() => fs.createWriteStream(path, options)).asCallback(callback);
}

function ensureWriteStreamSync(path, options) {
  if (!path) throw new TypeError('path is required!');

  checkParentSync(path);
  return fs.createWriteStream(path, options);
}

// access
['F_OK', 'R_OK', 'W_OK', 'X_OK'].forEach(key => {
  Object.defineProperty(exports, key, {
    enumerable: true,
    value: fs.constants[key],
    writable: false
  });
});

exports.access = accessAsync;
exports.accessSync = accessSync;

// appendFile
exports.appendFile = appendFile;
exports.appendFileSync = appendFileSync;

// chmod
exports.chmod = Promise.promisify(fs.chmod);
exports.chmodSync = fs.chmodSync;
exports.fchmod = Promise.promisify(fs.fchmod);
exports.fchmodSync = fs.fchmodSync;
exports.lchmod = Promise.promisify(fs.lchmod);
exports.lchmodSync = fs.lchmodSync;

// chown
exports.chown = Promise.promisify(fs.chown);
exports.chownSync = fs.chownSync;
exports.fchown = Promise.promisify(fs.fchown);
exports.fchownSync = fs.fchownSync;
exports.lchown = Promise.promisify(fs.lchown);
exports.lchownSync = fs.lchownSync;

// close
exports.close = Promise.promisify(fs.close);
exports.closeSync = fs.closeSync;

// copy
exports.copyDir = copyDir;
exports.copyFile = copyFile;

// createStream
exports.createReadStream = createReadStream;
exports.createWriteStream = createWriteStream;

// emptyDir
exports.emptyDir = emptyDir;
exports.emptyDirSync = emptyDirSync;

// ensurePath
exports.ensurePath = ensurePath;
exports.ensurePathSync = ensurePathSync;

// ensureWriteStream
exports.ensureWriteStream = ensureWriteStream;
exports.ensureWriteStreamSync = ensureWriteStreamSync;

// exists
exports.exists = exists;
exports.existsSync = existsSync;

// fsync
exports.fsync = Promise.promisify(fs.fsync);
exports.fsyncSync = fs.fsyncSync;

// link
exports.link = Promise.promisify(fs.link);
exports.linkSync = fs.linkSync;

// listDir
exports.listDir = listDir;
exports.listDirSync = listDirSync;

// mkdir
exports.mkdir = mkdirAsync;
exports.mkdirSync = fs.mkdirSync;

// mkdirs
exports.mkdirs = mkdirs;
exports.mkdirsSync = mkdirsSync;

// open
exports.open = Promise.promisify(fs.open);
exports.openSync = fs.openSync;

// symlink
exports.symlink = Promise.promisify(fs.symlink);
exports.symlinkSync = fs.symlinkSync;

// read
exports.read = Promise.promisify(fs.read);
exports.readSync = fs.readSync;

// readdir
exports.readdir = readdirAsync;
exports.readdirSync = fs.readdirSync;

// readFile
exports.readFile = readFile;
exports.readFileSync = readFileSync;

// readlink
exports.readlink = Promise.promisify(fs.readlink);
exports.readlinkSync = fs.readlinkSync;

// realpath
exports.realpath = Promise.promisify(fs.realpath);
exports.realpathSync = fs.realpathSync;

// rename
exports.rename = Promise.promisify(fs.rename);
exports.renameSync = fs.renameSync;

// rmdir
exports.rmdir = rmdir;
exports.rmdirSync = rmdirSync;

// stat
exports.stat = statAsync;
exports.statSync = fs.statSync;
exports.fstat = Promise.promisify(fs.fstat);
exports.fstatSync = fs.fstatSync;
exports.lstat = Promise.promisify(fs.lstat);
exports.lstatSync = fs.lstatSync;

// truncate
exports.truncate = Promise.promisify(fs.truncate);
exports.truncateSync = fs.truncateSync;
exports.ftruncate = Promise.promisify(fs.ftruncate);
exports.ftruncateSync = fs.ftruncateSync;

// unlink
exports.unlink = unlinkAsync;
exports.unlinkSync = fs.unlinkSync;

// utimes
exports.utimes = Promise.promisify(fs.utimes);
exports.utimesSync = fs.utimesSync;
exports.futimes = Promise.promisify(fs.futimes);
exports.futimesSync = fs.futimesSync;

// watch
exports.watch = watch;
exports.watchFile = fs.watchFile;
exports.unwatchFile = fs.unwatchFile;

// write
exports.write = Promise.promisify(fs.write);
exports.writeSync = fs.writeSync;

// writeFile
exports.writeFile = writeFile;
exports.writeFileSync = writeFileSync;

// Static classes
exports.Stats = fs.Stats;
exports.ReadStream = fs.ReadStream;
exports.WriteStream = fs.WriteStream;
exports.FileReadStream = fs.FileReadStream;
exports.FileWriteStream = fs.FileWriteStream;

// util
exports.escapeBOM = escapeBOM;
exports.escapeEOL = escapeEOL;
