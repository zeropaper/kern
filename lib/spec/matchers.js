var path = require('path');
var fs = require('fs');
var _ = require('underscore')._;


var common = {};
var server = {};
var client = {};


var matchers = {
  toBeAFunction: function() {
    return _.isFunction(this.actual);
  },
  toBeAString: function() {
    return _.isString(this.actual);
  },
  toBeAnArray: function() {
    return _.isArray(this.actual);
  },
  toHaveArrayValues: function(expected) {
    if (!_.isArray(this.actual)) return false;
    for (var e in expected) {
      var found = false;

      for (var a in this.actual) {
        
        if (this.actual[a] == expected[e]) {
          
          found = true;
        }
      }

      if (!found) {
        
        return false;
      }
    }
    
    return true;
  },
  arrayToHaveSaveValues: function(expected) {
    if (!_.isArray(this.actual)) throw new Error('Not an array');
    return _.difference(this, expected).length == 0;
  },
  toBeARegExp: function() {
    return _.isRegExp(this.actual);
  },
  toBeADate: function() {
    return _.isDate(this.actual);
  },
  toBeAnElement: function() {
    return _.isElement(this.actual);
  },
  toBeAModel: function() {
    return _.isFunction(this.actual.has) && _.isFunction(this.actual.get) && _.isFunction(this.actual.toJSON);
  },
  modelToHave: function(expected) {
    return this.actual.has(expected);
  },
  toBeACollection: function() {
    return _.isFunction(this.actual.at) && _.isFunction(this.actual.toJSON);
  },
  toBeAView: function() {
    return _.isFunction(this.actual.render) && _.isFunction(this.actual.initialize);
  },






  toHaveMethods: function(expected) {
    // if (!_.isArray(expected)) throw new Error("'expected' is not an array"); 
    for (var e in expected) {
      var name = expected[e]
        , defined = !_.isUndefined(this.actual[name])
        , method = _.isFunction(this.actual[name])
        , both = defined && method
      ;

      if (!both) return false;
    }
    return true;
  },
  toHaveMethod: function(expected) {
    return !_.isUndefined(this.actual[expected]) && _.isFunction(this.actual[expected]);
  },
  toHaveProperties: function(expected) {
    // if (!_.isArray(expected)) throw new Error("'expected' is not an array"); 
    for (var e in expected) {
      var name = expected[e]
        , defined = !_.isUndefined(this.actual[name])
        , method = !_.isFunction(this.actual[name])
        , both = defined && method
      ;
      
      if (!both) return false;
    }
    return true;
  },
  toHaveProperty: function(expected) {
    return !_.isUndefined(this.actual[expected]) && !_.isFunction(this.actual[expected]);
  },

  

  // Server side only -----------------------------------------------------------
  toBeADirectory: function() {
    if (path.existsSync(this.actual)) 
      return fs.statSync(this.actual).isDirectory();
    return false;
  },
  toBeAFile: function() {
    if (path.existsSync(this.actual)) 
      return fs.statSync(this.actual).isFile();
    return false;
  },
  /*
  toBeASymlink: function() {
    var stats = false;
    try {
      stats = fs.statSync(this.actual).isSym;
      if (stats && stats.SymbolicLink()) return true;
    } catch (e) {}
    return false;
  },
  */
  pathToExists: function() {
    return path.existsSync(this.actual);
  }
};

_.extend(exports, matchers);