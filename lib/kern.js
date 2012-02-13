(function(wexpows){
  var onServer = typeof window === 'undefined'
    , _
    , $
    , Backbone
    , methods
    , errors = {}
    , fs = {}
    , KernBone
    , debug
    , asModule = false
  ;
  
  if (onServer) {
    _           = require('underscore')._;
    $           = require('jQuery');
    Backbone    = require('backbone');
    KernBone    = require('./common/bone');
    methods     = require('./methods');
    
    debug       = {
      info:     require('debug')('KernInfo'),
      debug:    require('debug')('KernDebug'),
      log:      require('debug')('KernLog'),
      error:    require('debug')('KernError')
    };

    asModule    = require.main === module;
  }
  else {
    _           = window._;
    $           = window.jQuery || window.Zepto;
    Backbone    = window.Backbone;
    KernBone    = window.KernBone;
    methods     = window.KernMethods || {};
    
    debug       = typeof console != 'object' ? {log:function(){}, info:function(){}, error:function(){}} : console;
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
  
  
  
  
  errors.NotFound = function(msg) {
    this.name = 'NotFound';
    this.code = 404;
    this.description = msg;
    Error.call(this, msg);
    Error.captureStackTrace(this, arguments.callee);
  };
  errors.NotFound.prototype.__proto__ = Error.prototype;
    
  errors.Forbidden = function(msg) {
    this.name = 'Forbidden';
    this.code = 403;
    this.description = msg;
    Error.call(this, msg);
    Error.captureStackTrace(this, arguments.callee);
  };
  errors.Forbidden.prototype.__proto__ = Error.prototype;
  
  errors.InternalServerError = function(msg) {
    this.name = 'InternalServerError';
    this.code = 500;
    this.description = msg;
    Error.call(this, msg);
    Error.captureStackTrace(this, arguments.callee);
  };
  errors.InternalServerError.prototype.__proto__ = Error.prototype;

  
  /**
   * Kern Logger
   */
  function log() {
    var method = 'info';
    var scope = 'misc';
    var args = _.toArray(arguments);
    
    if (_.isFunction(debug[_.first(args)])) method = args.shift();
    if (_.isString(_.first(args)) && _.first(args).indexOf(' ') == -1) scope = args.shift();
    
    if (onServer) {
      debug[method].apply(this, _.flatten([new Date().toLocaleTimeString() +" | "+ scope +':', args]));
    }
    else {
      try {
        console[method].apply(this, _.flatten([scope, args]));
      } catch(e) {
//        console.error(e);
      }
    }
  }
  
  /**
   *  Class: Kern
   *  The Kern of the core...
   */
  var Kern = function(options) {
    if (typeof console.group != 'function') console.group = console.groupEnd = function(){}; 
    console.group('Kern initialization');
    var defaults = _.extend(!onServer ? {
          hostname:           window.location.hostname,
          port:               window.location.port
        } : {
          hostname:           'localhost',
          port:               80
        }, {
          crawlMaxDepth:      4,
          indexMaxEntries:    12,
          pageAtStart:        '/',
          contentWatchExp:    /^(text)\//i,
          staticExtExp:       /(js|css|jpg|png|gif|jpeg|mpg|mpeg|wmv|wma|mp3|mp4|m4a|m4v)$/i,
          redirectIndexDir:   true
        })
      
      , K = this
      , started = new Date().getTime()
    ;
    K.$ = $;
    options = options || {};
    K.started = function(){
      return started;
    };
    
    
    K.assets = {
      templates: {},
      scripts: {},
      styles: {},
      images: {},
      flash: {}
    };
    
    
    
    K.connected = {};
    K.paths = {};
    
    K.settings = {};
    K.extensions = {};
    _.extend(K.settings, defaults, options, {
        staticHostname: K.settings.hostname
      , staticPort: K.settings.hostname
      , staticPath: ''
      , staticUseCDN: false
    });
    
    
    _.extend(K, KernBone);
    _.extend(K.models, options.models || {});
    _.extend(K.collections, options.collections || {});
    _.extend(K.views, options.views || {});
    
    
    K.currentPage = false;
    K.struct = new K.models.ContentEntry({
      title: K.settings.appName,
      id: '/'
    }, {Kern: K, isRoot: true});
    
    
    K.initialize(options);
    
    K.bind('extensionloaded', function(extension){
      
    });

    _.each(options.extensions || [], function(extension){
      K.loadExtensions(extension, options);
    });
    
    

    
    
  };
  
  /**
   *  Variable: fs
   *  A hash containing callbacks for the "file system"
   */
  _.extend(fs, methods.fs);
  
  // Merging all the stuff
  _.extend(Kern.prototype, {
    started: function() {},
    runningFor: function() {
      return (new Date().getTime()) - this.started();
    },
    loadExtensions: function(ext, options) {
      var K = this;

      if (!onServer && ext.extensionName && !_.isUndefined(window[ext.extensionName])) {
        ext = window[ext.extensionName];
      }
      
      var requirementsCheck = !_.isFunction(ext.checkRequirements) || ext.checkRequirements.call(K) === true;
      

      if (requirementsCheck && _.isFunction(ext.extender)) {
        ext.extender.call(K, options);
      }


      K.trigger('extensionloaded', ext, options);
      if (ext.extensionName) {
        // console.log('debug', 'extension', 'Triggering '+ ext.extensionName +':loaded');
        K.extensions[ext.extensionName] = ext;
        K.trigger(ext.extensionName +':loaded', ext, options);
      }
      else {
        
      }
      
      K.trigger('extended', ext, options);
      
    },
    hasExtension: function(name) { return !_.isUndefined(this.extensions[name]); },
    getExtension: function(name) { return this.extensions[name]; },
    eval: function(content, info) {
      var K = this,
          $ = K.$,
          document = $('*')[0].ownerDocument,
          kernEvaluated
      ;
      // console.info('Evaluating with document',
      //   typeof document
      //   // content,
      //   // info
      // );
      try {
        K = this;
        eval(content);
      }
      catch (e) {
        // info.error = e;
        return e;
      }
    },
    dataById: function(id, scriptId) {
      var K = this;
      var c = K.paths[id];  
      if (_.isUndefined(c)) throw new Error('The '+ id +' path does not exists');
      console.info('dataById', id, scriptId);
      if (c.has(scriptId)) return c.get(scriptId);

      if (!c.has('data') || !c.get('data').length) {
        var script = c.get('scripts')[scriptId];
        if (script) {
          // if (_.isUndefined(c)) throw new Error('Missing script '+scriptId+' tag in '+id+'.');
          var kernEvaluated;
          script.error = K.eval(script.content, c.attributes);
          console.info(
            'Error?', script.error,
            'Info data?', c.attributes.data,
            'kernEvaluated?', kernEvaluated
          );
          if (!_.isUndefined(script.error)) throw script.error; 
        }
        else {
          throw new Error('Could not find or generate the data for '+id+'.'); 
        }
      }
      console.info('Generated data', c.get('data'));
      return c.get('data');
    },
    toJSON: function() {
      return {
        settings: {},
        extensions: {},
        struct: this.struct.toJSON(),
        assets: this.assetsToJSON()
      };
    },
    setAsset: function(type, asset){
      this[type] = this[type] || {};
      _.extend(this[type], asset);
    },
    // TODO: should strip the server side relevant things
    assetsToJSON: function() {
      return JSON.stringify(this.assets);
    },
    getTemplate: function(name) {
      var tmpl = this.$('#'+ name +'-template').html() || this.assets.templates[name +'-template'];
      tmpl = tmpl ? tmpl : '';
      if (!tmpl) {
        console.info('Could not find '+ templateName +' in '+ _.keys(this.assets.templates).join("\n"));
      }
      return tmpl;
    },
    
    render: function(templateName, variables) {
      var tmpl = this.getTemplate(templateName);
      try {
        return _.template(tmpl, _.extend({
          _: _,
          Kern: this
        }, variables));
      }
      catch (e) {
        console.error(e.stack, e.arguments, e.message);
        return 'Error in template: '+ templateName +'; '+ e.toString();
      }
    },

    initialize: function(options) {},
    atId: function(id) {
      return this.children.find(function(model){
        return model.id == id;
      });
    },
    paths: {},
    assets: {},
    log: log,
//    Models: {},
//    Views: {},
//    Collections: {},
    errors: errors
  }, methods, Backbone.Events);
  
  
  Kern.version = '0.0.1';
  
  Kern.Models = {};
  Kern.Collections = {};
  Kern.Views = {};
  
  Kern.isKern = wexpows.isKern = function(obj) {
    return obj instanceof Kern;
  };
  
  
  Kern.log = log;
  
  
  
  
  
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