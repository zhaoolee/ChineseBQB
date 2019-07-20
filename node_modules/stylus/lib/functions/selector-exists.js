var utils = require('../utils');

/**
 * Returns true if the given selector exists.
 *
 * @param {String} sel
 * @return {Boolean}
 * @api public
 */

module.exports = function selectorExists(sel) {
  utils.assertString(sel, 'selector');

  if (!this.__selectorsMap__) {
    var Normalizer = require('../visitor/normalizer')
      , visitor = new Normalizer(this.root.clone());
    visitor.visit(visitor.root);

    this.__selectorsMap__ = visitor.map;
  }

  return sel.string in this.__selectorsMap__;
};
