var _ = require('underscore')._
  , k = require('./../kern')
  , fs = require('fs')
  , path = require('path')
  , url = require('url')
  , server = exports
;

server.initialize = function() {
//  
  
  var SS = _.clone(this.settings.drupal._server);
  delete this.settings.drupal._server;
  
  
  if (!SS.installPath) {
    
    return;
  }
  var drupalDirStats = fs.statSync(SS.installPath+'');
  if (!drupalDirStats || !drupalDirStats.isDirectory()) {
    
    return;
  }
  
  

  K.assets.scripts['/drupal.js'] = {
    filepath: SS.installPath +'/misc/drupal.js',
    weight: -50
  };
  
  K.assets.scripts['/kern.drupal.js'] = {
    filepath: __dirname +'/drupal.js',
    weight: -1
  };
  
};
