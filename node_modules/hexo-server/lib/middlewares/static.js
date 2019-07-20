'use strict';

var serveStatic = require('serve-static');

module.exports = function(app) {
  app.use(this.config.root, serveStatic(this.public_dir, this.config.server.serveStatic));
};
