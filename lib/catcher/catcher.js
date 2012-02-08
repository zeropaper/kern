var _ = require('underscore')._
  , k = require('./../kern')
  , fs = require('fs')
  , path = require('path')
  , interval
;

exports.extensionName = 'catcher';
exports.version = '0.0.1';


exports.extender = function() {
  var K = this;
  clearInterval(interval);
  interval = setInterval(function(){
    
    fs.writeFile(K.cacheDir() +'/catcher.json', JSON.stringify(K.toJSON()), function (err) {
      if (err) 
    });
  }, 5000);
};