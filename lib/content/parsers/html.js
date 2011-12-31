var _ = require('underscore')._
  , fs = require('fs')
  , http = require('http')
  , url = require('url')
  , path = require('path')
  , child_process = require('child_process')
  , Inotify = false
;

exports.accept = "text/html";

exports.parser = function(info, cb) {
  var CE = this;
  CE.Kern.log('Parsing HTML file '+ CE.absPath());
  fs.readFile(CE.absPath(), function(err, data){
//    if (err) throw err;
//    CE.set(K.analyse(data.toString()), {silent: true});
//    CE.Kern.log('CE attributes after parsing', CE.attributes);
    if (_.isFunction(cb)) cb.call(CE, err, K.analyse(data.toString()));
  });
};