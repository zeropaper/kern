(function(wexpows){
  var onServer = typeof window === 'undefined'
    , _
    , $
    , Backbone
    , methods
    , fs = {}
    , KernBone
  ;
  
  if (onServer) {
    _           = require('underscore')._;
    $           = require('jquery');
    Backbone    = require('backbone');
    KernBone    = require('./common/bone');
    methods     = require('./methods');
    
    
  }
  else {
    _           = window._;
    $           = window.jQuery;
    Backbone    = window.Backbone;
    KernBone    = window.KernBone;
    methods     = window.KernMethods || {};
    
    console     = typeof console != 'object' ? {log:function(){}, info:function(){}, error:function(){}} : console;
  }

  
  // "Hide" the navbar
  function hideAddressbar() {
    window.scrollTo(0, 1);
  }
  
  function updateOrientation() {
    // Orientation
    var orientation = window.orientation;
    switch (orientation) {
      case 0:
        document.body.setAttribute("class", "portrait");
        break;
      case 90:
        document.body.setAttribute("class", "landscape");
        break;
      case -90:
        document.body.setAttribute("class", "landscape");
        break;
    }
    
    // Chrome mode
    // we're in fullscreen mode, either orientation
    if (orientation === 0 && window.innerHeight > 400 || orientation !== 0 && window.innerHeight > 290) {
      document.body.setAttribute("class", document.body.className + " fullscreen");
    }
    else {
      document.body.setAttribute("class", document.body.className + " chromed");
    }
    
    hideAddressbar();
  }

  /**
   *  Class: Kern
   *  The Kern of the core...
   */
  var Kern = function(options) {
    if (typeof console.group != 'function') console.group = console.groupEnd = function(){}; 
    console.group('Kern initialization');
    var defaults = _.extend(!onServer ? {
          hostname:   window.location.hostname,
          port:       window.location.port
        } : {
          hostname:   'localhost',
          port:       80
        }, {
          pageAtStart:        '/',
          contentWatchExp:    /^(image|video|audio|application)\//ig,
          staticExtExp:       /(js|css|jpg|png|gif|jpeg|mpg|mpeg|wmv|wma|mp3|mp4|m4a|m4v)/ig,
          redirectIndexDir:   true
        })
      
      , K = this
      , started = new Date
    ;
    
    options = options || {};
    started = started.getTime();
    K.started = function(){
      return started;
    };
    
    
    K.paths = {};
    K.settings = {};
    _.extend(K.settings, defaults, options || {});
    _.extend(K.settings, {
      staticHostname: K.settings.hostname
    , staticPort: K.settings.hostname
    , staticPath: ''
    , staticUseCDN: false
    });
    
    K.assets = {};
    K.connected = {};
    
    _.extend(K, KernBone);
    _.extend(K.models, options.models || {});
    _.extend(K.collections, options.collections || {});
    _.extend(K.views, options.views || {});
    
    K.currentPage = false;
    K.struct = new K.models.ContentEntry({}, {Kern: K, isRoot: true});
    
    K.initialize(options);
    _.each(options.extensions || [], function(extension){
      if (_.isFunction(extension.extender)) extension.extender.call(K, options);
    });
    
    console.log('info', "Kern props                   \n"+_.keys(K).join(', '));
    console.log('info', "Kern fs props                \n"+_.keys(K.fs).join(', '));
    console.log('info', "Kern app props               \n"+_.keys(K.app || {}).join(', '));
    console.log('info', "Kern paths                   \n"+_.keys(K.paths || {}).join(', '));
    /*
    try {
      K.settings = K.settings || {};
      K.applyFile(K.settings.pageAtStart || '/');
    }
    catch(e){console.error(e)};
    */
    console.groupEnd();
  };
  
  /**
   *  Variable: fs
   *  A hash containing callbacks for the "file system"
   */
  _.extend(fs, methods.fs);
  
  // Merging all the stuff
  _.extend(Kern.prototype, {
    initialize: function() {},
    paths: {}
  }, methods);

  Kern.version = '0.0.1';
  
  Kern.isKern = wexpows.isKern = function(obj) {
    return obj instanceof Kern;
  };
    
  wexpows.Kern = Kern;
  
  
  if (!onServer) {
    $(window).load(function() {
      updateOrientation();
      window.onorientationchange = updateOrientation;
    });
  }
  else {
    Kern.__dir = __dirname;
  }
  
  
})(typeof exports === 'undefined' ? this : exports);