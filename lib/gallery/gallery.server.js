gallery = exports;
var _ = require('underscore')._;
/**
 * Implements extender hook, server side
 */
gallery.extender = function() {
  var K = this;
  K.bind('gallery:initialized', function(){
    console.info('The simple module has been initialized, server side');
  });
  
  // Add the client side script to the assets,
  // it will be included in the html output
  K.assets.scripts['/kern.gallery.js'] = {
    filepath: __dirname +'/gallery.js',
  };
  
  var settings = {};
  _.extend(settings, K.settings.gallery || (K.settings.gallery = {}));
};