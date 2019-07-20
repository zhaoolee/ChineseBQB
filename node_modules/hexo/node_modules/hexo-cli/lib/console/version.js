'use strict';

const os = require('os');
const pkg = require('../../package.json');
const Promise = require('bluebird');

function versionConsole(args) {
  const versions = process.versions;
  const keys = Object.keys(versions);

  if (this.version) {
    console.log('hexo:', this.version);
  }

  console.log('hexo-cli:', pkg.version);
  console.log('os:', os.type(), os.release(), os.platform(), os.arch());

  for (let i = 0, len = keys.length; i < len; i++) {
    const key = keys[i];
    console.log('%s: %s', key, versions[key]);
  }

  return Promise.resolve();
}

module.exports = versionConsole;
