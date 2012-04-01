var _ = require('underscore')._
  , k = require('./../kern')
  , fs = require('fs')
  , path = require('path')
  , url = require('url')
  , server = exports
;

server.initialize = function() {
//  console.info('Drupal server initializer called with arguments', arguments);
  
  var SS = _.clone(this.settings.drupal._server);
  delete this.settings.drupal._server;
  console.info('Drupal Server side settings', SS, path.existsSync(SS.installPath +''));
  
  if (!SS.installPath) {
    console.error('Drupal: No Drupal installtion path provided', SS.installPath);
    return;
  }
  var drupalDirStats = fs.statSync(SS.installPath+'');
  if (!drupalDirStats || !drupalDirStats.isDirectory()) {
    console.error('Drupal: SS.installPath is not valid', SS.installPath);
    return;
  }
  
  console.info('Drupal installation found at '+ SS.installPath);

  K.assets.scripts['/drupal.js'] = {
    filepath: SS.installPath +'/misc/drupal.js',
    weight: -50
  };
  
  K.assets.scripts['/kern.drupal.js'] = {
    filepath: __dirname +'/drupal.js',
    weight: -1
  };
  
};
