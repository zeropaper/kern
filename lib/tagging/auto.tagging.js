var _ = require('underscore')._
  , fs = require('fs')
  , path = require('path')
  , url = require('url')
;

exports.extensionName = 'autotagging';
exports.version = '0.0.1';

exports.extender = function() {
  var K = this;
  if (_.isUndefined(K.app)) 
    return;
    
//  var settings = K.settings.autotagging = _.extend({
//    //
//  }, K.settings.autotagging || {});
  

  
  K.assets.scripts['/kern.autotagging.js'] = {
    filepath: __dirname + '/auto.tagging.client.js'
  };
  
  K.bind('initialized', function(){
    K.log('debug', 'autotagging', 'Tunes can initialize...');
  });
  
//  K.loadTemplates(__dirname +'/templates.html');
  
  
};