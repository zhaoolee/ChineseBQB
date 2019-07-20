#!/usr/bin/env node
'use strict';

var path = require('path');
var webpack = require('webpack');
var fs = require('fs');

var VERSION = JSON.parse(fs.readFileSync('./package.json')).version;
var TYPE = '';
var SLIM = false;
var MINIFIED = false;
var TARGET = '';

var args = process.argv.slice(2);
while(args.length > 0) {
    if(args.length === 1) {
        TARGET = args[0];
    }
    else {
        switch(args[0]) {
        case '-s':
            SLIM = true;
            TYPE = '(slim, only works with precompiled templates)';
            break;
        case '-m':
            MINIFIED = true;
            break;
        }
    }
    args.shift();
}

var config = {
    entry: './index.js',
    output: {
        path: path.join(__dirname, '../browser'),
        filename: TARGET,
        library: 'nunjucks',
        libraryTarget: 'umd'
    },
    node: {
        process: 'empty'
    },
    plugins: [
        new webpack.NormalModuleReplacementPlugin(/(path|precompile)$/,
                                                  'node-libs-browser/mock/empty'),
        new webpack.BannerPlugin(
            'Browser bundle of nunjucks ' + VERSION + ' ' + TYPE
        ),
        new webpack.DefinePlugin({
            'process.env': {
                IS_BROWSER: true
            }
        })
    ]
};

if(SLIM) {
    config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(
            /(nodes|lexer|parser|transformer|compiler|loaders)$/,
            'node-libs-browser/mock/empty'
        )
    );
}
else {
    config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(/loaders\.js$/,
                                                  './web-loaders.js')
    );
}

if(MINIFIED) {
    config.plugins.push(
        new webpack.optimize.UglifyJsPlugin({ sourceMap: false })
    );
}

var outputOptions = {
    cached: false,
    cachedAssets: false
};

webpack(config).run(function (err, stats) {
    if(err) {
        throw new Error(err);
    }
    console.log(stats.toString(outputOptions));
});
