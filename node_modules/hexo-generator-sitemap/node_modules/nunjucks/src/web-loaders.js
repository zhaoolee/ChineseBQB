'use strict';

var Loader = require('./loader');
var PrecompiledLoader = require('./precompiled-loader.js');

var WebLoader = Loader.extend({
    init: function(baseURL, opts) {
        this.baseURL = baseURL || '.';
        opts = opts || {};

        // By default, the cache is turned off because there's no way
        // to "watch" templates over HTTP, so they are re-downloaded
        // and compiled each time. (Remember, PRECOMPILE YOUR
        // TEMPLATES in production!)
        this.useCache = !!opts.useCache;

        // We default `async` to false so that the simple synchronous
        // API can be used when you aren't doing anything async in
        // your templates (which is most of the time). This performs a
        // sync ajax request, but that's ok because it should *only*
        // happen in development. PRECOMPILE YOUR TEMPLATES.
        this.async = !!opts.async;
    },

    resolve: function(from, to) { // jshint ignore:line
        throw new Error('relative templates not support in the browser yet');
    },

    getSource: function(name, cb) {
        var useCache = this.useCache;
        var result;
        this.fetch(this.baseURL + '/' + name, function(err, src) {
            if(err) {
                if(cb) {
                    cb(err.content);
                } else {
                    if (err.status === 404) {
                      result = null;
                    } else {
                      throw err.content;
                    }
                }
            }
            else {
                result = { src: src,
                           path: name,
                           noCache: !useCache };
                if(cb) {
                    cb(null, result);
                }
            }
        });

        // if this WebLoader isn't running asynchronously, the
        // fetch above would actually run sync and we'll have a
        // result here
        return result;
    },

    fetch: function(url, cb) {
        // Only in the browser please
        var ajax;
        var loading = true;

        if(window.XMLHttpRequest) { // Mozilla, Safari, ...
            ajax = new XMLHttpRequest();
        }
        else if(window.ActiveXObject) { // IE 8 and older
            /* global ActiveXObject */
            ajax = new ActiveXObject('Microsoft.XMLHTTP');
        }

        ajax.onreadystatechange = function() {
            if(ajax.readyState === 4 && loading) {
                loading = false;
                if(ajax.status === 0 || ajax.status === 200) {
                    cb(null, ajax.responseText);
                }
                else {
                    cb({ status: ajax.status, content: ajax.responseText });
                }
            }
        };

        url += (url.indexOf('?') === -1 ? '?' : '&') + 's=' +
               (new Date().getTime());

        ajax.open('GET', url, this.async);
        ajax.send();
    }
});

module.exports = {
    WebLoader: WebLoader,
    PrecompiledLoader: PrecompiledLoader
};
