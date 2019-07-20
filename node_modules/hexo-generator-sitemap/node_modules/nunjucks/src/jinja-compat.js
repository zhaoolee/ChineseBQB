function installCompat() {
  'use strict';

  // This must be called like `nunjucks.installCompat` so that `this`
  // references the nunjucks instance
  var runtime = this.runtime; // jshint ignore:line
  var lib = this.lib; // jshint ignore:line

  var orig_contextOrFrameLookup = runtime.contextOrFrameLookup;
  runtime.contextOrFrameLookup = function(context, frame, key) {
    var val = orig_contextOrFrameLookup.apply(this, arguments);
    if (val === undefined) {
      switch (key) {
      case 'True':
        return true;
      case 'False':
        return false;
      case 'None':
        return null;
      }
    }

    return val;
  };

  var orig_memberLookup = runtime.memberLookup;
  var ARRAY_MEMBERS = {
    pop: function(index) {
      if (index === undefined) {
        return this.pop();
      }
      if (index >= this.length || index < 0) {
        throw new Error('KeyError');
      }
      return this.splice(index, 1);
    },
    remove: function(element) {
      for (var i = 0; i < this.length; i++) {
        if (this[i] === element) {
          return this.splice(i, 1);
        }
      }
      throw new Error('ValueError');
    },
    count: function(element) {
      var count = 0;
      for (var i = 0; i < this.length; i++) {
        if (this[i] === element) {
          count++;
        }
      }
      return count;
    },
    index: function(element) {
      var i;
      if ((i = this.indexOf(element)) === -1) {
        throw new Error('ValueError');
      }
      return i;
    },
    find: function(element) {
      return this.indexOf(element);
    },
    insert: function(index, elem) {
      return this.splice(index, 0, elem);
    }
  };
  var OBJECT_MEMBERS = {
    items: function() {
      var ret = [];
      for(var k in this) {
        ret.push([k, this[k]]);
      }
      return ret;
    },
    values: function() {
      var ret = [];
      for(var k in this) {
        ret.push(this[k]);
      }
      return ret;
    },
    keys: function() {
      var ret = [];
      for(var k in this) {
        ret.push(k);
      }
      return ret;
    },
    get: function(key, def) {
      var output = this[key];
      if (output === undefined) {
        output = def;
      }
      return output;
    },
    has_key: function(key) {
      return this.hasOwnProperty(key);
    },
    pop: function(key, def) {
      var output = this[key];
      if (output === undefined && def !== undefined) {
        output = def;
      } else if (output === undefined) {
        throw new Error('KeyError');
      } else {
        delete this[key];
      }
      return output;
    },
    popitem: function() {
      for (var k in this) {
        // Return the first object pair.
        var val = this[k];
        delete this[k];
        return [k, val];
      }
      throw new Error('KeyError');
    },
    setdefault: function(key, def) {
      if (key in this) {
        return this[key];
      }
      if (def === undefined) {
        def = null;
      }
      return this[key] = def;
    },
    update: function(kwargs) {
      for (var k in kwargs) {
        this[k] = kwargs[k];
      }
      return null;  // Always returns None
    }
  };
  OBJECT_MEMBERS.iteritems = OBJECT_MEMBERS.items;
  OBJECT_MEMBERS.itervalues = OBJECT_MEMBERS.values;
  OBJECT_MEMBERS.iterkeys = OBJECT_MEMBERS.keys;
  runtime.memberLookup = function(obj, val, autoescape) { // jshint ignore:line
    obj = obj || {};

    // If the object is an object, return any of the methods that Python would
    // otherwise provide.
    if (lib.isArray(obj) && ARRAY_MEMBERS.hasOwnProperty(val)) {
      return function() {return ARRAY_MEMBERS[val].apply(obj, arguments);};
    }

    if (lib.isObject(obj) && OBJECT_MEMBERS.hasOwnProperty(val)) {
      return function() {return OBJECT_MEMBERS[val].apply(obj, arguments);};
    }

    return orig_memberLookup.apply(this, arguments);
  };
}

module.exports = installCompat;
