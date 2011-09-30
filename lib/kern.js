(function(wexpows){
  var onServer = typeof window === 'undefined'
    , _
    , $
    , Backbone
    , methods
    , log = function(){}
    , fs = {}
    , models
    , views
  ;
  
  if (onServer) {
    _         = require('underscore')._;
    $         = require('jquery');
    Backbone  = require('backbone');
    methods   = require('./methods');
  }
  else {
    _         = window._;
    $         = window.jQuery;
    Backbone  = window.Backbone;
    console   = typeof console != 'object' ? {log:function(){}, info:function(){}, error:function(){}} : console;
    methods   = window.KernMethods || {};
    
  }
  
  models    = methods.models;
  views     = methods.views;
  
  log = function() {
    console.log.apply(console, arguments);
    // would be nice to forward the logging to the socket for mobile devices debuging
  };
  
  /**
   *  Class: Kern
   *  The Kern of the core...
   */
  var Kern = function(options) {
    // console.log('Creating the Kern', options);
    var defaults = _.extend(!onServer ? {
        hostname:   window.location.hostname,
        port:       window.location.port
      } : {
        hostname:   'localhost',
        port:       80
      }, {
        redirectIndexDir: true,
      })
      , K = this
    ;
    K.files = {};
    K.routes = {};
    K.settings = {};
    K.models = _.clone(options.models || {});
    K.views = _.clone(options.views || {});
    _.extend(K.settings, defaults, options || {});
    K.initialize(options);
  };
  
  /**
   *  Variable: fs
   *  A hash containing callbacks for the "file system"
   */
  _.extend(fs, methods.fs);
  //console.info("fs.methods:\n - "+ _.keys(fs).join("\n - "));
  //console.info("fs.methods.getFiles:\n - "+ methods.fs.getFiles.toString());
  
  
  // Merging all the stuff
  _.extend(Kern.prototype, {
    initialize: function() {},
    log: log,
    routes: {},
  }, methods);

  
  log('The following methods are available on the '+ (onServer ? 'server' : 'client') +': '+ _.keys(Kern.prototype).join(', '));
  log('The following FS methods are available on the '+ (onServer ? 'server' : 'client') +': '+ _.keys(Kern.prototype.fs).join(', '));
  
  Kern.version = '0.0.1';
  
  Kern.isKern = wexpows.isKern = function(obj) {
    return obj instanceof Kern;
  };
  
  
  wexpows.Kern = Kern;
})(typeof exports === 'undefined' ? this : exports);