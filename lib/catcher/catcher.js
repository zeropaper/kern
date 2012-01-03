var _ = require('underscore')._
  , k = require('./../kern')
  , fs = require('fs')
  , path = require('path')
//  , cache = {}
;


function write(CE) {
  var K = CE.Kern;
  K.log('debug', 'catcher', CE.absPath() + ' has changed, save it to the cache');
  fs.writeFile(K.cacheDir() +'/catcher.json', JSON.stringify(K.toJSON()), function (err) {
    if (err) K.log('error', 'catcher', 'Cache write failed');
    K.log('debug', 'catcher', 'Cache write succeed');
  });
}

exports.extender = function() {
  var K = this;
  K.bind('newcontent', write);
  K.bind('contentchange', write);
};