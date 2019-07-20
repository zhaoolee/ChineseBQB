'use strict';

function precompileGlobal(templates, opts) {
    var out = '', name, template;
    opts = opts || {};

    for ( var i = 0; i < templates.length; i++ ) {
        name = JSON.stringify(templates[i].name);
        template = templates[i].template;

        out += '(function() {' +
            '(window.nunjucksPrecompiled = window.nunjucksPrecompiled || {})' +
            '[' + name + '] = (function() {\n' + template + '\n})();\n';

        if(opts.asFunction) {
            out += 'return function(ctx, cb) { return nunjucks.render(' + name + ', ctx, cb); }\n';
        }

        out += '})();\n';
    }
    return out;
}

module.exports = precompileGlobal;
