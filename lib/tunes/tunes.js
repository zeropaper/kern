var _ = require('underscore')._
  , k = require('./../kern')
  , fs = require('fs')
  , path = require('path')
  , url = require('url')
;

exports.extensionName = 'KernTunes';
exports.version = '0.0.1';

exports.extender = function() {
  var K = this;
  if (_.isUndefined(K.app)) 
    return;
    
  var settings = K.settings.tunes = _.extend({
    albumsURL: '/kern.tunes/albums'
  , albumsContainer: '#kern-tunes-albums'
  }, K.settings.tunes || {});
  
  K.assets.scripts['/kern.tunes.js'] = {
    filepath: __dirname + '/tunes.client.js'
  };
  
  if (settings.albumsURL) {
    K.app.get(settings.albumsURL, function(req, res, next) {
      var albums = [];
      res.json(albums);
    });
  }
  
  
  K.bind('initialized', function(){
    
  });
  
  K.loadTemplates(__dirname +'/templates.html');
  K.rules['tunes'] = function(analysed, place) {
    if (!place) 
      return;
    
  };
};
