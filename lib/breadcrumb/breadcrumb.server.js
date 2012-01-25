breadcrumb = exports;
var _ = require('underscore')._;

/**
 * Implements extender hook, server side
 */
breadcrumb.extender = function() {
  var K = this;
  K.bind('breadcrumb:initialized', function(){
    K.log('info', ' MENU --- The breadcrumb module has been initialized, server side');
  });
  
  K.loadTemplates(__dirname + '/templates.html');

  K.log('info', ' MENU --- Adding the client script for the breadcrumb to the assets');
  // Add the client side script to the assets,
  // it will be included in the html output
  K.assets.scripts['/kern.breadcrumb.js'] = {
    filepath: __dirname +'/breadcrumb.js',
  };

  
  K.bind('fileapplied', function(file){
    K.getExtension('breadcrumb').render({
      Kern: K,
      file: file,
      files: K.files
    });
  });
  
};


