(function(simplemodule){
  
  var onServer   = typeof exports != 'undefined',
      common     = {},
      settings   = {},
      defaults   = {},
      _          = onServer ? require('underscore')._ : window._,
      $
  ;
  
  
  
  
  common.extensionName = 'simplemodule';
  
  
  
  
  /**
   * Implements expender hook
   */
  common.extender = function() {
    // this function is overriden on server side, its safe to use the window
    var K = this;
    $ = K.$;
    
    K.bind('simplemodule:initialized', function(){
      console.info('The simple module has been initialized, client side');
      console.info('$ is '+ typeof $);
    });
    
    _.extend(settings, K.settings.simplemodule || (K.settings.simplemodule = {}));
  };
  
  
  /**
   * Implements initialize hook
   */
  common.initialize = function() {
    var K = this;
    console.info('---- SimpleModule ----- is initializing Kern');
    
    K.trigger('simplemodule:initialized');
  };
  
  
  _.extend(
    simplemodule,
    common, 
    onServer ? _.extend(simplemodule, require('./simplemodule.server.js')) : {}
  );
})(typeof exports == 'undefined' ? this.simplemodule = {} : exports);
