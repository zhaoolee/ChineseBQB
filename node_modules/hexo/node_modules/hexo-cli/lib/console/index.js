'use strict';

module.exports = function(ctx) {
  const { console } = ctx.extend;

  console.register('help', 'Get help on a command.', {}, require('./help'));

  console.register('init', 'Create a new Hexo folder.', {
    desc: 'Create a new Hexo folder at the specified path or the current directory.',
    usage: '[destination]',
    arguments: [
      {name: 'destination', desc: 'Folder path. Initialize in current folder if not specified'}
    ],
    options: [
      {name: '--no-clone', desc: 'Copy files instead of cloning from GitHub'},
      {name: '--no-install', desc: 'Skip npm install'}
    ]
  }, require('./init'));

  console.register('version', 'Display version information.', {}, require('./version'));
};
