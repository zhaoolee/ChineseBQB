'use strict';

var lib = require('./lib');
var r = require('./runtime');

function normalize(value, defaultValue) {
    if(value === null || value === undefined || value === false) {
        return defaultValue;
    }
    return value;
}

var filters = {
    abs: function(n) {
        return Math.abs(n);
    },

    batch: function(arr, linecount, fill_with) {
        var i;
        var res = [];
        var tmp = [];

        for(i = 0; i < arr.length; i++) {
            if(i % linecount === 0 && tmp.length) {
                res.push(tmp);
                tmp = [];
            }

            tmp.push(arr[i]);
        }

        if(tmp.length) {
            if(fill_with) {
                for(i = tmp.length; i < linecount; i++) {
                    tmp.push(fill_with);
                }
            }

            res.push(tmp);
        }

        return res;
    },

    capitalize: function(str) {
        str = normalize(str, '');
        var ret = str.toLowerCase();
        return r.copySafeness(str, ret.charAt(0).toUpperCase() + ret.slice(1));
    },

    center: function(str, width) {
        str = normalize(str, '');
        width = width || 80;

        if(str.length >= width) {
            return str;
        }

        var spaces = width - str.length;
        var pre = lib.repeat(' ', spaces/2 - spaces % 2);
        var post = lib.repeat(' ', spaces/2);
        return r.copySafeness(str, pre + str + post);
    },

    'default': function(val, def, bool) {
        if(bool) {
            return val ? val : def;
        }
        else {
            return (val !== undefined) ? val : def;
        }
    },

    dictsort: function(val, case_sensitive, by) {
        if (!lib.isObject(val)) {
            throw new lib.TemplateError('dictsort filter: val must be an object');
        }

        var array = [];
        for (var k in val) {
            // deliberately include properties from the object's prototype
            array.push([k,val[k]]);
        }

        var si;
        if (by === undefined || by === 'key') {
            si = 0;
        } else if (by === 'value') {
            si = 1;
        } else {
            throw new lib.TemplateError(
                'dictsort filter: You can only sort by either key or value');
        }

        array.sort(function(t1, t2) {
            var a = t1[si];
            var b = t2[si];

            if (!case_sensitive) {
                if (lib.isString(a)) {
                    a = a.toUpperCase();
                }
                if (lib.isString(b)) {
                    b = b.toUpperCase();
                }
            }

            return a > b ? 1 : (a === b ? 0 : -1);
        });

        return array;
    },

    dump: function(obj) {
        return JSON.stringify(obj);
    },

    escape: function(str) {
        if(str instanceof r.SafeString) {
            return str;
        }
        str = (str === null || str === undefined) ? '' : str;
        return r.markSafe(lib.escape(str.toString()));
    },

    safe: function(str) {
        if (str instanceof r.SafeString) {
            return str;
        }
        str = (str === null || str === undefined) ? '' : str;
        return r.markSafe(str.toString());
    },

    first: function(arr) {
        return arr[0];
    },

    groupby: function(arr, attr) {
        return lib.groupBy(arr, attr);
    },

    indent: function(str, width, indentfirst) {
        str = normalize(str, '');

        if (str === '') return '';

        width = width || 4;
        var res = '';
        var lines = str.split('\n');
        var sp = lib.repeat(' ', width);

        for(var i=0; i<lines.length; i++) {
            if(i === 0 && !indentfirst) {
                res += lines[i] + '\n';
            }
            else {
                res += sp + lines[i] + '\n';
            }
        }

        return r.copySafeness(str, res);
    },

    join: function(arr, del, attr) {
        del = del || '';

        if(attr) {
            arr = lib.map(arr, function(v) {
                return v[attr];
            });
        }

        return arr.join(del);
    },

    last: function(arr) {
        return arr[arr.length-1];
    },

    length: function(val) {
        var value = normalize(val, '');

        if(value !== undefined) {
            if(
                (typeof Map === 'function' && value instanceof Map) ||
                (typeof Set === 'function' && value instanceof Set)
            ) {
                // ECMAScript 2015 Maps and Sets
                return value.size;
            }
            if(lib.isObject(value) && !(value instanceof r.SafeString)) {
                // Objects (besides SafeStrings), non-primative Arrays
                return Object.keys(value).length;
            }
            return value.length;
        }
        return 0;
    },

    list: function(val) {
        if(lib.isString(val)) {
            return val.split('');
        }
        else if(lib.isObject(val)) {
            var keys = [];

            if(Object.keys) {
                keys = Object.keys(val);
            }
            else {
                for(var k in val) {
                    keys.push(k);
                }
            }

            return lib.map(keys, function(k) {
                return { key: k,
                         value: val[k] };
            });
        }
        else if(lib.isArray(val)) {
          return val;
        }
        else {
            throw new lib.TemplateError('list filter: type not iterable');
        }
    },

    lower: function(str) {
        str = normalize(str, '');
        return str.toLowerCase();
    },

    random: function(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    },

    rejectattr: function(arr, attr) {
      return arr.filter(function (item) {
        return !item[attr];
      });
    },

    selectattr: function(arr, attr) {
      return arr.filter(function (item) {
        return !!item[attr];
      });
    },

    replace: function(str, old, new_, maxCount) {
        var originalStr = str;

        if (old instanceof RegExp) {
            return str.replace(old, new_);
        }

        if(typeof maxCount === 'undefined'){
            maxCount = -1;
        }

        var res = '';  // Output

        // Cast Numbers in the search term to string
        if(typeof old === 'number'){
            old = old + '';
        }
        else if(typeof old !== 'string') {
            // If it is something other than number or string,
            // return the original string
            return str;
        }

        // Cast numbers in the replacement to string
        if(typeof str === 'number'){
            str = str + '';
        }

        // If by now, we don't have a string, throw it back
        if(typeof str !== 'string' && !(str instanceof r.SafeString)){
            return str;
        }

        // ShortCircuits
        if(old === ''){
            // Mimic the python behaviour: empty string is replaced
            // by replacement e.g. "abc"|replace("", ".") -> .a.b.c.
            res = new_ + str.split('').join(new_) + new_;
            return r.copySafeness(str, res);
        }

        var nextIndex = str.indexOf(old);
        // if # of replacements to perform is 0, or the string to does
        // not contain the old value, return the string
        if(maxCount === 0 || nextIndex === -1){
            return str;
        }

        var pos = 0;
        var count = 0; // # of replacements made

        while(nextIndex  > -1 && (maxCount === -1 || count < maxCount)){
            // Grab the next chunk of src string and add it with the
            // replacement, to the result
            res += str.substring(pos, nextIndex) + new_;
            // Increment our pointer in the src string
            pos = nextIndex + old.length;
            count++;
            // See if there are any more replacements to be made
            nextIndex = str.indexOf(old, pos);
        }

        // We've either reached the end, or done the max # of
        // replacements, tack on any remaining string
        if(pos < str.length) {
            res += str.substring(pos);
        }

        return r.copySafeness(originalStr, res);
    },

    reverse: function(val) {
        var arr;
        if(lib.isString(val)) {
            arr = filters.list(val);
        }
        else {
            // Copy it
            arr = lib.map(val, function(v) { return v; });
        }

        arr.reverse();

        if(lib.isString(val)) {
            return r.copySafeness(val, arr.join(''));
        }
        return arr;
    },

    round: function(val, precision, method) {
        precision = precision || 0;
        var factor = Math.pow(10, precision);
        var rounder;

        if(method === 'ceil') {
            rounder = Math.ceil;
        }
        else if(method === 'floor') {
            rounder = Math.floor;
        }
        else {
            rounder = Math.round;
        }

        return rounder(val * factor) / factor;
    },

    slice: function(arr, slices, fillWith) {
        var sliceLength = Math.floor(arr.length / slices);
        var extra = arr.length % slices;
        var offset = 0;
        var res = [];

        for(var i=0; i<slices; i++) {
            var start = offset + i * sliceLength;
            if(i < extra) {
                offset++;
            }
            var end = offset + (i + 1) * sliceLength;

            var slice = arr.slice(start, end);
            if(fillWith && i >= extra) {
                slice.push(fillWith);
            }
            res.push(slice);
        }

        return res;
    },

    sum: function(arr, attr, start) {
        var sum = 0;

        if(typeof start === 'number'){
            sum += start;
        }

        if(attr) {
            arr = lib.map(arr, function(v) {
                return v[attr];
            });
        }

        for(var i = 0; i < arr.length; i++) {
            sum += arr[i];
        }

        return sum;
    },

    sort: r.makeMacro(['value', 'reverse', 'case_sensitive', 'attribute'], [], function(arr, reverse, caseSens, attr) {
         // Copy it
        arr = lib.map(arr, function(v) { return v; });

        arr.sort(function(a, b) {
            var x, y;

            if(attr) {
                x = a[attr];
                y = b[attr];
            }
            else {
                x = a;
                y = b;
            }

            if(!caseSens && lib.isString(x) && lib.isString(y)) {
                x = x.toLowerCase();
                y = y.toLowerCase();
            }

            if(x < y) {
                return reverse ? 1 : -1;
            }
            else if(x > y) {
                return reverse ? -1: 1;
            }
            else {
                return 0;
            }
        });

        return arr;
    }),

    string: function(obj) {
        return r.copySafeness(obj, obj);
    },

    striptags: function(input, preserve_linebreaks) {
        input = normalize(input, '');
        preserve_linebreaks = preserve_linebreaks || false;
        var tags = /<\/?([a-z][a-z0-9]*)\b[^>]*>|<!--[\s\S]*?-->/gi;
        var trimmedInput = filters.trim(input.replace(tags, ''));
        var res = '';
        if (preserve_linebreaks) {
            res = trimmedInput
                .replace(/^ +| +$/gm, '')     // remove leading and trailing spaces
                .replace(/ +/g, ' ')          // squash adjacent spaces
                .replace(/(\r\n)/g, '\n')     // normalize linebreaks (CRLF -> LF)
                .replace(/\n\n\n+/g, '\n\n'); // squash abnormal adjacent linebreaks
        } else {
            res = trimmedInput.replace(/\s+/gi, ' ');
        }
        return r.copySafeness(input, res);
    },

    title: function(str) {
        str = normalize(str, '');
        var words = str.split(' ');
        for(var i = 0; i < words.length; i++) {
            words[i] = filters.capitalize(words[i]);
        }
        return r.copySafeness(str, words.join(' '));
    },

    trim: function(str) {
        return r.copySafeness(str, str.replace(/^\s*|\s*$/g, ''));
    },

    truncate: function(input, length, killwords, end) {
        var orig = input;
        input = normalize(input, '');
        length = length || 255;

        if (input.length <= length)
            return input;

        if (killwords) {
            input = input.substring(0, length);
        } else {
            var idx = input.lastIndexOf(' ', length);
            if(idx === -1) {
                idx = length;
            }

            input = input.substring(0, idx);
        }

        input += (end !== undefined && end !== null) ? end : '...';
        return r.copySafeness(orig, input);
    },

    upper: function(str) {
        str = normalize(str, '');
        return str.toUpperCase();
    },

    urlencode: function(obj) {
        var enc = encodeURIComponent;
        if (lib.isString(obj)) {
            return enc(obj);
        } else {
            var parts;
            if (lib.isArray(obj)) {
                parts = obj.map(function(item) {
                    return enc(item[0]) + '=' + enc(item[1]);
                });
            } else {
                parts = [];
                for (var k in obj) {
                    if (obj.hasOwnProperty(k)) {
                        parts.push(enc(k) + '=' + enc(obj[k]));
                    }
                }
            }
            return parts.join('&');
        }
    },

    urlize: function(str, length, nofollow) {
        if (isNaN(length)) length = Infinity;

        var noFollowAttr = (nofollow === true ? ' rel="nofollow"' : '');

        // For the jinja regexp, see
        // https://github.com/mitsuhiko/jinja2/blob/f15b814dcba6aa12bc74d1f7d0c881d55f7126be/jinja2/utils.py#L20-L23
        var puncRE = /^(?:\(|<|&lt;)?(.*?)(?:\.|,|\)|\n|&gt;)?$/;
        // from http://blog.gerv.net/2011/05/html5_email_address_regexp/
        var emailRE = /^[\w.!#$%&'*+\-\/=?\^`{|}~]+@[a-z\d\-]+(\.[a-z\d\-]+)+$/i;
        var httpHttpsRE = /^https?:\/\/.*$/;
        var wwwRE = /^www\./;
        var tldRE = /\.(?:org|net|com)(?:\:|\/|$)/;

        var words = str.split(/(\s+)/).filter(function(word) {
          // If the word has no length, bail. This can happen for str with
          // trailing whitespace.
          return word && word.length;
        }).map(function(word) {
          var matches = word.match(puncRE);
          var possibleUrl = matches && matches[1] || word;

          // url that starts with http or https
          if (httpHttpsRE.test(possibleUrl))
            return '<a href="' + possibleUrl + '"' + noFollowAttr + '>' + possibleUrl.substr(0, length) + '</a>';

          // url that starts with www.
          if (wwwRE.test(possibleUrl))
            return '<a href="http://' + possibleUrl + '"' + noFollowAttr + '>' + possibleUrl.substr(0, length) + '</a>';

          // an email address of the form username@domain.tld
          if (emailRE.test(possibleUrl))
            return '<a href="mailto:' + possibleUrl + '">' + possibleUrl + '</a>';

          // url that ends in .com, .org or .net that is not an email address
          if (tldRE.test(possibleUrl))
            return '<a href="http://' + possibleUrl + '"' + noFollowAttr + '>' + possibleUrl.substr(0, length) + '</a>';

          return word;

        });

        return words.join('');
    },

    wordcount: function(str) {
        str = normalize(str, '');
        var words = (str) ? str.match(/\w+/g) : null;
        return (words) ? words.length : null;
    },

    'float': function(val, def) {
        var res = parseFloat(val);
        return isNaN(res) ? def : res;
    },

    'int': function(val, def) {
        var res = parseInt(val, 10);
        return isNaN(res) ? def : res;
    }
};

// Aliases
filters.d = filters['default'];
filters.e = filters.escape;

module.exports = filters;
