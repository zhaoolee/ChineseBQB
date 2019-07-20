'use strict';

const logger = require('hexo-log');
const chalk = require('chalk');
const { EventEmitter } = require('events');
const Promise = require('bluebird');
const ConsoleExtend = require('./extend/console');

// a stub Hexo object
// see `hexojs/hexo/lib/hexo/index.js`

function Context(base = process.cwd(), args = {}) {
  EventEmitter.call(this);

  this.base_dir = base;
  this.log = logger(args);

  this.extend = {
    console: new ConsoleExtend()
  };
}

require('util').inherits(Context, EventEmitter);

Context.prototype.init = () => {
  // Do nothing
};

Context.prototype.call = function(name, args, callback) {
  if (!callback && typeof args === 'function') {
    callback = args;
    args = {};
  }

  return new Promise((resolve, reject) => {
    const c = this.extend.console.get(name);

    if (c) {
      c.call(this, args).then(resolve, reject);
    } else {
      reject(new Error(`Console \`${name}\` has not been registered yet!`));
    }
  }).asCallback(callback);
};

Context.prototype.exit = function(err) {
  if (err) {
    this.log.fatal(
      {err},
      'Something\'s wrong. Maybe you can find the solution here: %s',
      chalk.underline('http://hexo.io/docs/troubleshooting.html')
    );
  }

  return Promise.resolve();
};

Context.prototype.unwatch = () => {
  // Do nothing
};

module.exports = Context;
