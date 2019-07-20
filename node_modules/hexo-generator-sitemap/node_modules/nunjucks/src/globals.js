'use strict';

function cycler(items) {
    var index = -1;

    return {
        current: null,
        reset: function() {
            index = -1;
            this.current = null;
        },

        next: function() {
            index++;
            if(index >= items.length) {
                index = 0;
            }

            this.current = items[index];
            return this.current;
        },
    };

}

function joiner(sep) {
    sep = sep || ',';
    var first = true;

    return function() {
        var val = first ? '' : sep;
        first = false;
        return val;
    };
}

// Making this a function instead so it returns a new object
// each time it's called. That way, if something like an environment
// uses it, they will each have their own copy.
function globals() {
    return {
        range: function(start, stop, step) {
            if(typeof stop === 'undefined') {
                stop = start;
                start = 0;
                step = 1;
            }
            else if(!step) {
                step = 1;
            }

            var arr = [];
            var i;
            if (step > 0) {
                for (i=start; i<stop; i+=step) {
                    arr.push(i);
                }
            } else {
                for (i=start; i>stop; i+=step) {
                    arr.push(i);
                }
            }
            return arr;
        },

        // lipsum: function(n, html, min, max) {
        // },

        cycler: function() {
            return cycler(Array.prototype.slice.call(arguments));
        },

        joiner: function(sep) {
            return joiner(sep);
        }
    };
}

module.exports = globals;
