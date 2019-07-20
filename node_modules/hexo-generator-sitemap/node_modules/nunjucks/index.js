'use strict';

var lib = require('./src/lib');
var env = require('./src/environment');
var Loader = require('./src/loader');
var loaders = require('./src/loaders');
var precompile = require('./src/precompile');

module.exports = {};
module.exports.Environment = env.Environment;
module.exports.Template = env.Template;

module.exports.Loader = Loader;
module.exports.FileSystemLoader = loaders.FileSystemLoader;
module.exports.PrecompiledLoader = loaders.PrecompiledLoader;
module.exports.WebLoader = loaders.WebLoader;

module.exports.compiler = require('./src/compiler');
module.exports.parser = require('./src/parser');
module.exports.lexer = require('./src/lexer');
module.exports.runtime = require('./src/runtime');
module.exports.lib = lib;
module.exports.nodes = require('./src/nodes');

module.exports.installJinjaCompat = require('./src/jinja-compat.js');

// A single instance of an environment, since this is so commonly used

var e;
module.exports.configure = function(templatesPath, opts) {
    opts = opts || {};
    if(lib.isObject(templatesPath)) {
        opts = templatesPath;
        templatesPath = null;
    }

    var TemplateLoader;
    if(loaders.FileSystemLoader) {
        TemplateLoader = new loaders.FileSystemLoader(templatesPath, {
            watch: opts.watch,
            noCache: opts.noCache
        });
    }
    else if(loaders.WebLoader) {
        TemplateLoader = new loaders.WebLoader(templatesPath, {
            useCache: opts.web && opts.web.useCache,
            async: opts.web && opts.web.async
        });
    }

    e = new env.Environment(TemplateLoader, opts);

    if(opts && opts.express) {
        e.express(opts.express);
    }

    return e;
};

module.exports.compile = function(src, env, path, eagerCompile) {
    if(!e) {
        module.exports.configure();
    }
    return new module.exports.Template(src, env, path, eagerCompile);
};

module.exports.render = function(name, ctx, cb) {
    if(!e) {
        module.exports.configure();
    }

    return e.render(name, ctx, cb);
};

module.exports.renderString = function(src, ctx, cb) {
    if(!e) {
        module.exports.configure();
    }

    return e.renderString(src, ctx, cb);
};

if(precompile) {
    module.exports.precompile = precompile.precompile;
    module.exports.precompileString = precompile.precompileString;
}
