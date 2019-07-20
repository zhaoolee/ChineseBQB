'use strict';

module.exports = function(app) {
  var config = this.config.server || {};
  if (!config.header) return;

  app.use(function(req, res, next) {
    res.setHeader('X-Powered-By', 'Hexo');
    next();
  });
};
