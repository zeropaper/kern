(function(hud){
  
  var onServer   = typeof exports != 'undefined',
      common     = {},
      settings   = {},
      defaults   = {},
      _          = onServer ? require('underscore')._ : window._,
      $
  ;
  
  
  
  
  common.extensionName = 'hud';
  
  
  
  
  /**
   * Implements expender hook
   */
  common.extender = function() {
    // this function is overriden on server side, its safe to use the window
    var K = this;
    $ = K.$;
    
    K.bind('hud:initialized', function(){
      
      
    });
    
    _.extend(settings, K.settings.hud || (K.settings.hud = {}));
  };
  
  
  /**
   * Implements initialize hook
   */
  common.initialize = function() {
    var K = this;
    
    
    K.trigger('hud:initialized');
  };
  
  
  _.extend(
    hud,
    common, 
    onServer ? _.extend(hud, require('./hud.server.js')) : {}
  );
})(typeof exports == 'undefined' ? this.hud = {} : exports);
