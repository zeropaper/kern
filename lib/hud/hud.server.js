hud = exports;

/**
 * Implements extender hook, server side
 */
hud.extender = function() {
  var K = this;
  K.bind('hud:initialized', function(){
    
  });
  
  // Add the client side script to the assets,
  // it will be included in the html output
  K.assets.scripts['/kern.hud.js'] = {
    filepath: __dirname +'/hud.js',
  };
  
  
  _.extend(settings, K.settings.hud || (K.settings.hud = {}));
};

