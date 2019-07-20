'use strict';

var fs = require('fs');
var path = require('path');
var lib = require('./lib');
var compiler = require('./compiler');
var Environment = require('./environment').Environment;
var precompileGlobal = require('./precompile-global');

function match(filename, patterns) {
    if (!Array.isArray(patterns)) return false;
    return patterns.some(function (pattern) {
        return filename.match(pattern) !== null;
    });
}

function precompileString(str, opts) {
    opts = opts || {};
    opts.isString = true;
    return precompile(str, opts);
}

function precompile(input, opts) {
    // The following options are available:
    //
    // * name: name of the template (auto-generated when compiling a directory)
    // * isString: input is a string, not a file path
    // * asFunction: generate a callable function
    // * force: keep compiling on error
    // * env: the Environment to use (gets extensions and async filters from it)
    // * include: which file/folders to include (folders are auto-included, files are auto-excluded)
    // * exclude: which file/folders to exclude (folders are auto-included, files are auto-excluded)
    // * wrapper: function(templates, opts) {...}
    //       Customize the output format to store the compiled template.
    //       By default, templates are stored in a global variable used by the runtime.
    //       A custom loader will be necessary to load your custom wrapper.

    opts = opts || {};
    var env = opts.env || new Environment([]);
    var wrapper = opts.wrapper || precompileGlobal;

    var pathStats = fs.existsSync(input) && fs.statSync(input);
    var precompiled = [];
    var templates = [];

    function addTemplates(dir) {
        var files = fs.readdirSync(dir);

        for(var i=0; i<files.length; i++) {
            var filepath = path.join(dir, files[i]);
            var subpath = filepath.substr(path.join(input, '/').length);
            var stat = fs.statSync(filepath);

            if(stat && stat.isDirectory()) {
                subpath += '/';
                if (!match(subpath, opts.exclude)) {
                    addTemplates(filepath);
                }
            }
            else if(match(subpath, opts.include)) {
                templates.push(filepath);
            }
        }
    }

    if(opts.isString) {
        if(!opts.name) {
            throw new Error('the "name" option is required when ' +
                            'compiling a string');
        }

        precompiled.push( _precompile(
            input,
            opts.name,
            env
        ) );
    }
    else if(pathStats.isFile()) {
        precompiled.push( _precompile(
            fs.readFileSync(input, 'utf-8'),
            opts.name || input,
            env
        ) );
    }
    else if(pathStats.isDirectory()) {
        addTemplates(input);

        for(var i=0; i<templates.length; i++) {
            var name = templates[i].replace(path.join(input, '/'), '');

            try {
                precompiled.push( _precompile(
                    fs.readFileSync(templates[i], 'utf-8'),
                    name,
                    env
                ) );
            } catch(e) {
                if(opts.force) {
                    // Don't stop generating the output if we're
                    // forcing compilation.
                    console.error(e);
                }
                else {
                    throw e;
                }
            }
        }
    }

    return wrapper(precompiled, opts);
}

function _precompile(str, name, env) {
    env = env || new Environment([]);

    var asyncFilters = env.asyncFilters;
    var extensions = env.extensionsList;
    var template;

    name = name.replace(/\\/g, '/');

    try {
        template = compiler.compile(str,
                                    asyncFilters,
                                    extensions,
                                    name,
                                    env.opts);
    }
    catch(err) {
        throw lib.prettifyError(name, false, err);
    }

    return { name: name, template: template };
}

module.exports = {
    precompile: precompile,
    precompileString: precompileString
};
