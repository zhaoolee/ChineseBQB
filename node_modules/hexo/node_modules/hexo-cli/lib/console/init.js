'use strict';

const Promise = require('bluebird');
const pathFn = require('path');
const chalk = require('chalk');
const fs = require('hexo-fs');
const tildify = require('tildify');
const spawn = require('hexo-util/lib/spawn');
const commandExistsSync = require('command-exists').sync;

const ASSET_DIR = pathFn.join(__dirname, '../../assets');
const GIT_REPO_URL = 'https://github.com/hexojs/hexo-starter.git';

function initConsole(args) {
  args = Object.assign({ install: true, clone: true }, args);

  const baseDir = this.base_dir;
  const target = args._[0] ? pathFn.resolve(baseDir, String(args._[0])) : baseDir;
  const { log } = this;

  if (fs.existsSync(target) && fs.readdirSync(target).length !== 0) {
    log.fatal(`${chalk.magenta(tildify(target))} not empty, please run \`hexo init\` on an empty folder and then copy your files into it`);
    return Promise.reject(new Error('target not empty'));
  }

  log.info('Cloning hexo-starter', GIT_REPO_URL);

  let promise;

  if (args.clone) {
    promise = spawn('git', ['clone', '--recursive', GIT_REPO_URL, target], {
      stdio: 'inherit'
    });
  } else {
    promise = copyAsset(target);
  }

  return promise.catch(() => {
    log.warn('git clone failed. Copying data instead');

    return copyAsset(target);
  }).then(() => Promise.all([
    removeGitDir(target),
    removeGitModules(target)
  ])).then(() => {
    if (!args.install) return;

    log.info('Install dependencies');

    const npmCommand = commandExistsSync('yarn') ? 'yarn' : 'npm';

    return spawn(npmCommand, ['install', '--production'], {
      cwd: target,
      stdio: 'inherit'
    });
  }).then(() => {
    log.info('Start blogging with Hexo!');
  }).catch(() => {
    log.warn('Failed to install dependencies. Please run \'npm install\' manually!');
  });
}

function copyAsset(target) {
  return fs.copyDir(ASSET_DIR, target, { ignoreHidden: false });
}

function removeGitDir(target) {
  const gitDir = pathFn.join(target, '.git');

  return fs.stat(gitDir).catch(err => {
    if (err.cause && err.cause.code === 'ENOENT') return;
    throw err;
  }).then(stats => {
    if (stats) {
      return stats.isDirectory() ? fs.rmdir(gitDir) : fs.unlink(gitDir);
    }
  }).then(() => fs.readdir(target)).map(path => pathFn.join(target, path)).filter(path => fs.stat(path).then(stats => stats.isDirectory())).each(removeGitDir);
}

function removeGitModules(target) {
  return fs.unlink(pathFn.join(target, '.gitmodules')).catch(err => {
    if (err.cause && err.cause.code === 'ENOENT') return;
    throw err;
  });
}

module.exports = initConsole;
