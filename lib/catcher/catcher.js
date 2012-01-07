var _ = require('underscore')._
  , k = require('./../kern')
  , fs = require('fs')
  , path = require('path')
  , interval
;

exports.extender = function() {
  var K = this;
  clearInterval(interval);
  interval = setInterval(function(){
    K.log('debug', 'catcher', 'Writing the cache');
    fs.writeFile(K.cacheDir() +'/catcher.json', JSON.stringify(K.toJSON()), function (err) {
      if (err) K.log('error', 'catcher', 'Cache write failed');
      K.log('debug', 'catcher', 'Cache write succeed');
    });
  }, 5000);
};