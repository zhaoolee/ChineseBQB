'use strict';

var path = require('path');
var asap = require('asap');
var lib = require('./lib');
var Obj = require('./object');
var compiler = require('./compiler');
var builtin_filters = require('./filters');
var builtin_loaders = require('./loaders');
var runtime = require('./runtime');
var globals = require('./globals');
var Frame = runtime.Frame;
var Template;

// Unconditionally load in this loader, even if no other ones are
// included (possible in the slim browser build)
builtin_loaders.PrecompiledLoader = require('./precompiled-loader');

// If the user is using the async API, *always* call it
// asynchronously even if the template was synchronous.
function callbackAsap(cb, err, res) {
    asap(function() { cb(err, res); });
}

var Environment = Obj.extend({
    init: function(loaders, opts) {
        // The dev flag determines the trace that'll be shown on errors.
        // If set to true, returns the full trace from the error point,
        // otherwise will return trace starting from Template.render
        // (the full trace from within nunjucks may confuse developers using
        //  the library)
        // defaults to false
        opts = this.opts = opts || {};
        this.opts.dev = !!opts.dev;

        // The autoescape flag sets global autoescaping. If true,
        // every string variable will be escaped by default.
        // If false, strings can be manually escaped using the `escape` filter.
        // defaults to true
        this.opts.autoescape = opts.autoescape != null ? opts.autoescape : true;

        // If true, this will make the system throw errors if trying
        // to output a null or undefined value
        this.opts.throwOnUndefined = !!opts.throwOnUndefined;
        this.opts.trimBlocks = !!opts.trimBlocks;
        this.opts.lstripBlocks = !!opts.lstripBlocks;

        this.loaders = [];

        if(!loaders) {
            // The filesystem loader is only available server-side
            if(builtin_loaders.FileSystemLoader) {
                this.loaders = [new builtin_loaders.FileSystemLoader('views')];
            }
            else if(builtin_loaders.WebLoader) {
                this.loaders = [new builtin_loaders.WebLoader('/views')];
            }
        }
        else {
            this.loaders = lib.isArray(loaders) ? loaders : [loaders];
        }

        // It's easy to use precompiled templates: just include them
        // before you configure nunjucks and this will automatically
        // pick it up and use it
        if(process.env.IS_BROWSER && window.nunjucksPrecompiled) {
            this.loaders.unshift(
                new builtin_loaders.PrecompiledLoader(window.nunjucksPrecompiled)
            );
        }

        this.initCache();

        this.globals = globals();
        this.filters = {};
        this.asyncFilters = [];
        this.extensions = {};
        this.extensionsList = [];

        for(var name in builtin_filters) {
            this.addFilter(name, builtin_filters[name]);
        }
    },

    initCache: function() {
        // Caching and cache busting
        lib.each(this.loaders, function(loader) {
            loader.cache = {};

            if(typeof loader.on === 'function') {
                loader.on('update', function(template) {
                    loader.cache[template] = null;
                });
            }
        });
    },

    addExtension: function(name, extension) {
        extension._name = name;
        this.extensions[name] = extension;
        this.extensionsList.push(extension);
        return this;
    },

    removeExtension: function(name) {
        var extension = this.getExtension(name);
        if (!extension) return;

        this.extensionsList = lib.without(this.extensionsList, extension);
        delete this.extensions[name];
    },

    getExtension: function(name) {
        return this.extensions[name];
    },

    hasExtension: function(name) {
        return !!this.extensions[name];
    },

    addGlobal: function(name, value) {
        this.globals[name] = value;
        return this;
    },

    getGlobal: function(name) {
        if(typeof this.globals[name] === 'undefined') {
            throw new Error('global not found: ' + name);
        }
        return this.globals[name];
    },

    addFilter: function(name, func, async) {
        var wrapped = func;

        if(async) {
            this.asyncFilters.push(name);
        }
        this.filters[name] = wrapped;
        return this;
    },

    getFilter: function(name) {
        if(!this.filters[name]) {
            throw new Error('filter not found: ' + name);
        }
        return this.filters[name];
    },

    resolveTemplate: function(loader, parentName, filename) {
        var isRelative = (loader.isRelative && parentName)? loader.isRelative(filename) : false;
        return (isRelative && loader.resolve)? loader.resolve(parentName, filename) : filename;
    },

    getTemplate: function(name, eagerCompile, parentName, ignoreMissing, cb) {
        var that = this;
        var tmpl = null;
        if(name && name.raw) {
            // this fixes autoescape for templates referenced in symbols
            name = name.raw;
        }

        if(lib.isFunction(parentName)) {
            cb = parentName;
            parentName = null;
            eagerCompile = eagerCompile || false;
        }

        if(lib.isFunction(eagerCompile)) {
            cb = eagerCompile;
            eagerCompile = false;
        }

        if (name instanceof Template) {
             tmpl = name;
        }
        else if(typeof name !== 'string') {
            throw new Error('template names must be a string: ' + name);
        }
        else {
            for (var i = 0; i < this.loaders.length; i++) {
                var _name = this.resolveTemplate(this.loaders[i], parentName, name);
                tmpl = this.loaders[i].cache[_name];
                if (tmpl) break;
            }
        }

        if(tmpl) {
            if(eagerCompile) {
                tmpl.compile();
            }

            if(cb) {
                cb(null, tmpl);
            }
            else {
                return tmpl;
            }
        } else {
            var syncResult;
            var _this = this;

            var createTemplate = function(err, info) {
                if(!info && !err) {
                    if(!ignoreMissing) {
                        err = new Error('template not found: ' + name);
                    }
                }

                if (err) {
                    if(cb) {
                        cb(err);
                    }
                    else {
                        throw err;
                    }
                }
                else {
                    var tmpl;
                    if(info) {
                        tmpl = new Template(info.src, _this,
                                            info.path, eagerCompile);

                        if(!info.noCache) {
                            info.loader.cache[name] = tmpl;
                        }
                    }
                    else {
                        tmpl = new Template('', _this,
                                            '', eagerCompile);
                    }

                    if(cb) {
                        cb(null, tmpl);
                    }
                    else {
                        syncResult = tmpl;
                    }
                }
            };

            lib.asyncIter(this.loaders, function(loader, i, next, done) {
                function handle(err, src) {
                    if(err) {
                        done(err);
                    }
                    else if(src) {
                        src.loader = loader;
                        done(null, src);
                    }
                    else {
                        next();
                    }
                }

                // Resolve name relative to parentName
                name = that.resolveTemplate(loader, parentName, name);

                if(loader.async) {
                    loader.getSource(name, handle);
                }
                else {
                    handle(null, loader.getSource(name));
                }
            }, createTemplate);

            return syncResult;
        }
    },

    express: function(app) {
        var env = this;

        function NunjucksView(name, opts) {
            this.name          = name;
            this.path          = name;
            this.defaultEngine = opts.defaultEngine;
            this.ext           = path.extname(name);
            if (!this.ext && !this.defaultEngine) throw new Error('No default engine was specified and no extension was provided.');
            if (!this.ext) this.name += (this.ext = ('.' !== this.defaultEngine[0] ? '.' : '') + this.defaultEngine);
        }

        NunjucksView.prototype.render = function(opts, cb) {
          env.render(this.name, opts, cb);
        };

        app.set('view', NunjucksView);
        app.set('nunjucksEnv', this);
        return this;
    },

    render: function(name, ctx, cb) {
        if(lib.isFunction(ctx)) {
            cb = ctx;
            ctx = null;
        }

        // We support a synchronous API to make it easier to migrate
        // existing code to async. This works because if you don't do
        // anything async work, the whole thing is actually run
        // synchronously.
        var syncResult = null;

        this.getTemplate(name, function(err, tmpl) {
            if(err && cb) {
                callbackAsap(cb, err);
            }
            else if(err) {
                throw err;
            }
            else {
                syncResult = tmpl.render(ctx, cb);
            }
        });

        return syncResult;
    },

    renderString: function(src, ctx, opts, cb) {
        if(lib.isFunction(opts)) {
            cb = opts;
            opts = {};
        }
        opts = opts || {};

        var tmpl = new Template(src, this, opts.path);
        return tmpl.render(ctx, cb);
    }
});

var Context = Obj.extend({
    init: function(ctx, blocks, env) {
        // Has to be tied to an environment so we can tap into its globals.
        this.env = env || new Environment();

        // Make a duplicate of ctx
        this.ctx = {};
        for(var k in ctx) {
            if(ctx.hasOwnProperty(k)) {
                this.ctx[k] = ctx[k];
            }
        }

        this.blocks = {};
        this.exported = [];

        for(var name in blocks) {
            this.addBlock(name, blocks[name]);
        }
    },

    lookup: function(name) {
        // This is one of the most called functions, so optimize for
        // the typical case where the name isn't in the globals
        if(name in this.env.globals && !(name in this.ctx)) {
            return this.env.globals[name];
        }
        else {
            return this.ctx[name];
        }
    },

    setVariable: function(name, val) {
        this.ctx[name] = val;
    },

    getVariables: function() {
        return this.ctx;
    },

    addBlock: function(name, block) {
        this.blocks[name] = this.blocks[name] || [];
        this.blocks[name].push(block);
        return this;
    },

    getBlock: function(name) {
        if(!this.blocks[name]) {
            throw new Error('unknown block "' + name + '"');
        }

        return this.blocks[name][0];
    },

    getSuper: function(env, name, block, frame, runtime, cb) {
        var idx = lib.indexOf(this.blocks[name] || [], block);
        var blk = this.blocks[name][idx + 1];
        var context = this;

        if(idx === -1 || !blk) {
            throw new Error('no super block available for "' + name + '"');
        }

        blk(env, context, frame, runtime, cb);
    },

    addExport: function(name) {
        this.exported.push(name);
    },

    getExported: function() {
        var exported = {};
        for(var i=0; i<this.exported.length; i++) {
            var name = this.exported[i];
            exported[name] = this.ctx[name];
        }
        return exported;
    }
});

Template = Obj.extend({
    init: function (src, env, path, eagerCompile) {
        this.env = env || new Environment();

        if(lib.isObject(src)) {
            switch(src.type) {
            case 'code': this.tmplProps = src.obj; break;
            case 'string': this.tmplStr = src.obj; break;
            }
        }
        else if(lib.isString(src)) {
            this.tmplStr = src;
        }
        else {
            throw new Error('src must be a string or an object describing ' +
                            'the source');
        }

        this.path = path;

        if(eagerCompile) {
            var _this = this;
            try {
                _this._compile();
            }
            catch(err) {
                throw lib.prettifyError(this.path, this.env.opts.dev, err);
            }
        }
        else {
            this.compiled = false;
        }
    },

    render: function(ctx, parentFrame, cb) {
        if (typeof ctx === 'function') {
            cb = ctx;
            ctx = {};
        }
        else if (typeof parentFrame === 'function') {
            cb = parentFrame;
            parentFrame = null;
        }

        var forceAsync = true;
        if(parentFrame) {
            // If there is a frame, we are being called from internal
            // code of another template, and the internal system
            // depends on the sync/async nature of the parent template
            // to be inherited, so force an async callback
            forceAsync = false;
        }

        var _this = this;
        // Catch compile errors for async rendering
        try {
            _this.compile();
        } catch (_err) {
            var err = lib.prettifyError(this.path, this.env.opts.dev, _err);
            if (cb) return callbackAsap(cb, err);
            else throw err;
        }

        var context = new Context(ctx || {}, _this.blocks, _this.env);
        var frame = parentFrame ? parentFrame.push(true) : new Frame();
        frame.topLevel = true;
        var syncResult = null;

        _this.rootRenderFunc(
            _this.env,
            context,
            frame || new Frame(),
            runtime,
            function(err, res) {
                if(err) {
                    err = lib.prettifyError(_this.path, _this.env.opts.dev, err);
                }

                if(cb) {
                    if(forceAsync) {
                        callbackAsap(cb, err, res);
                    }
                    else {
                        cb(err, res);
                    }
                }
                else {
                    if(err) { throw err; }
                    syncResult = res;
                }
            }
        );

        return syncResult;
    },


    getExported: function(ctx, parentFrame, cb) {
        if (typeof ctx === 'function') {
            cb = ctx;
            ctx = {};
        }

        if (typeof parentFrame === 'function') {
            cb = parentFrame;
            parentFrame = null;
        }

        // Catch compile errors for async rendering
        try {
            this.compile();
        } catch (e) {
            if (cb) return cb(e);
            else throw e;
        }

        var frame = parentFrame ? parentFrame.push() : new Frame();
        frame.topLevel = true;

        // Run the rootRenderFunc to populate the context with exported vars
        var context = new Context(ctx || {}, this.blocks, this.env);
        this.rootRenderFunc(this.env,
                            context,
                            frame,
                            runtime,
                            function(err) {
        		        if ( err ) {
        			    cb(err, null);
        		        } else {
        			    cb(null, context.getExported());
        		        }
                            });
    },

    compile: function() {
        if(!this.compiled) {
            this._compile();
        }
    },

    _compile: function() {
        var props;

        if(this.tmplProps) {
            props = this.tmplProps;
        }
        else {
            var source = compiler.compile(this.tmplStr,
                                          this.env.asyncFilters,
                                          this.env.extensionsList,
                                          this.path,
                                          this.env.opts);

            /* jslint evil: true */
            var func = new Function(source);
            props = func();
        }

        this.blocks = this._getBlocks(props);
        this.rootRenderFunc = props.root;
        this.compiled = true;
    },

    _getBlocks: function(props) {
        var blocks = {};

        for(var k in props) {
            if(k.slice(0, 2) === 'b_') {
                blocks[k.slice(2)] = props[k];
            }
        }

        return blocks;
    }
});

module.exports = {
    Environment: Environment,
    Template: Template
};
