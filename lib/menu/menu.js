(function(menu){
  
  var onServer   = typeof exports != 'undefined',
      common     = {},
      settings   = {},
      defaults   = {},
      _          = onServer ? require('underscore')._ : window._,
      $
      counter    = 0
  ;
  
  
  
  
  common.extensionName = 'menu';
  
  
  
  
  /**
   * Implements expender hook
   */
  common.extender = function() {
    // this function is overridden on server side, its safe to use the window
    var K = this;
    $ = K.$;
    console.info(' MENU --- ---- Menu ----- is extending Kern');
    
    K.bind('menu:initialized', function(){
      console.info(' MENU --- The menu module has been initialized, client side');
      console.info(' MENU --- $ is '+ typeof $);
    });
    
    _.extend(settings, K.settings.menu || (K.settings.menu = {}));

    K.bind('menu:loaded', function(){
      common.initialize.call(K);
    });
  };
  
  
  /**
   * Implements initialize hook
   */
  common.initialize = function() {
    var K = this;
    console.info(' MENU --- is initializing Kern', onServer);
    
    K.trigger('menu:initialized');

    counter++;
    $('[role=page-navigation]').text('Menu comes here '+ counter);
    
  };
  
  
  
  _.extend(
    menu,
    common, 
    onServer ? require('./menu.server.js') : {}
  );
})(typeof exports == 'undefined' ? this.menu = {} : exports);
