gallery = exports;
var _ = require('underscore')._;
/**
 * Implements extender hook, server side
 */
gallery.extender = function() {
  var K = this;
  K.bind('gallery:initialized', function(){
    
  });
  
  // Add the client side script to the assets,
  // it will be included in the html output
  K.assets.scripts['/kern.gallery.js'] = {
    filepath: __dirname +'/gallery.js',
  };
  
  K.loadTemplates(__dirname +'/templates.html');
  
  var settings = {};
  _.extend(settings, K.settings.gallery || (K.settings.gallery = {}));
};