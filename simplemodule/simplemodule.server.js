simplemodule = exports;

/**
 * Implements extender hook, server side
 */
simplemodule.extender = function() {
  var K = this;
  K.bind('simplemodule:initialized', function(){
    console.info('The simple module has been initialized, server side');
  });
  
  // Add the client side script to the assets,
  // it will be included in the html output
  K.assets.scripts['/kern.simplemodule.js'] = {
    filepath: __dirname +'/simplemodule.js',
  };
  
  
  _.extend(settings, K.settings.simplemodule || (K.settings.simplemodule = {}));
};

