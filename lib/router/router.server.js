KernRouter = exports;

/**
 * Implements extender hook, server side
 */
KernRouter.extender = function() {
  var K = this;
  K.bind('KernRouter:initialized', function(){
    console.info('The router module has been initialized, server side');
  });
  
  // Add the client side script to the assets,
  // it will be included in the html output
  K.assets.scripts['/kern.router.js'] = {
    filepath: __dirname +'/router.js',
  };
  
  
  _.extend(settings, K.settings.KernRouter || (K.settings.KernRouter = {}));
};

