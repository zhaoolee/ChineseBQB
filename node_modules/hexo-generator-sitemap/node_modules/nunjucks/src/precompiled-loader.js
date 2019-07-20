'use strict';

var Loader = require('./loader');

var PrecompiledLoader = Loader.extend({
    init: function(compiledTemplates) {
        this.precompiled = compiledTemplates || {};
    },

    getSource: function(name) {
        if (this.precompiled[name]) {
            return {
                src: { type: 'code',
                       obj: this.precompiled[name] },
                path: name
            };
        }
        return null;
    }
});

module.exports = PrecompiledLoader;
