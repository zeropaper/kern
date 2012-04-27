(function(KernRouter){
  
  var onServer   = typeof exports != 'undefined',
      common     = {},
      settings   = {},
      defaults   = {},
      _          = onServer ? require('underscore')._ : window._,
      Backbone   = onServer ? require('backbone') : window.Backbone,
      $
  ;
  var Router = Backbone.Router.extend({});
  
  
  
  
  common.extensionName = 'KernRouter';
  
  
  
  
  /**
   * Implements expender hook
   */
  common.extender = function() {
    // this function is overriden on server side, its safe to use the window
    var K = this;
    $ = K.$;
    
    K.bind('KernRouter:initialized', function(){
      
      
    });
    
    _.extend(settings, K.settings.KernRouter || (K.settings.KernRouter = {}));
  };
  


  var Router = Backbone.Router.extend({
    
  });



  
  /**
   * Implements initialize hook
   */
  common.initialize = function() {
    var K = this;
    
    
    K.router = new Router();
    
    K.trigger('KernRouter:initialized');
  };
  
  
  _.extend(
    KernRouter,
    common, 
    onServer ? require(__dirname +'/router.server.js') : {}
  );
})(typeof exports == 'undefined' ? this.KernRouter = {} : exports);
