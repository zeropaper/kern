
(function(){

  // Initial Setup
  // -------------

  // Save a reference to the global object.
  var root = this;

  // Save the previous value of the `Kern` variable.
  var previousKern = root.Kern;

  // The top-level namespace. All public Kern classes and modules will
  // be attached to this. Exported for both CommonJS and the browser.
  var Kern;
  if (typeof exports !== 'undefined') {
    Kern = exports;
  } else {
    Kern = root.Kern = {};
  }
  
  // Current version of the library. Keep in sync with `package.json`.
  Kern.VERSION = '0.0.2';

  // Require Underscore, if we're on the server, and it's not already present.
  var _ = root._;
  if (!_ && (typeof require !== 'undefined')) _ = require('underscore')._;
  
  // Require Backbone, if we're on the server, and it's not already present.
  var Backbone = root.Backbone;
  if (!Backbone && (typeof require !== 'undefined')) Backbone = require('backbone');

  // For Kern's purposes, jQuery or Zepto owns the `$` variable.
  var $ = root.jQuery || root.Zepto;
  if (!$ && (typeof require !== 'undefined')) $ = require('jquery');
  
  // Runs Kern.js in *noConflict* mode, returning the `Kern` variable
  // to its previous owner. Returns a reference to this Kern object.
  Kern.noConflict = function() {
    root.Kern = previousKern;
    return this;
  };
  
  
  
  
  
  
  
  
  
  
  var 
    FileSystemNodeDef
    
    ThingChildren    = Backbone.Collection.extend({
      comparator:  function(model) {
        return model.get('sortWeight');
      }
    }),
    
    
    Thing            = Backbone.Model.extend({
      image:       function() {},
      description: function() {},
      // The Backbone.Model already have a url method
      //url:         function() {},
      name:        function() {},
      defaults:    {
        sortWeight: 0,
        name: null,
        description: null,
        image: null,
        url: null
      }
    }),
    

    ThingView        = Backbone.View.extend({}),
    

    FileSystemNode   = Backbone.Model.extend({
      children:    null,
      hasChildren: function() {
        return this.children.length ? true : false;
      },
      initialize:  function() {
        console.info('Initializing Kern.Thing', this);
        this.children = new ThingChildren();
      }
    }),

    AssetFile        = FileSystemNode.extend({
      children:    null,
      hasChildren: function() {
        return this.children.length ? true : false;
      },
      defaults: {
        callback: null,
        filepath: false,
        sortWeight: 0
      },
      initialize:  function() {
        console.info('Initializing Kern.Thing', this);
        this.children = new ThingChildren();
      }
    })
  ;
}).call(this);
