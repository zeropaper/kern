menu = exports;
var _ = require('underscore')._;

/**
 * Implements extender hook, server side
 */
menu.extender = function() {
  var K = this;
  K.bind('menu:initialized', function(){
    K.log('info', 'menu', 'The menu module has been initialized, server side');
  });
  
  
  K.log('info', 'menu', ' MENU --- Adding the client script for the menu to the assets');
  // Add the client side script to the assets,
  // it will be included in the html output
  K.assets.scripts['/kern.menu.js'] = {
    filepath: __dirname +'/menu.js',
  };
  
  K.loadTemplates(__dirname +'/templates.html');
  
};


