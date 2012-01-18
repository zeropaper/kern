var _ = require('underscore')._
  , fs = require('fs')
  , http = require('http')
  , url = require('url')
  , path = require('path')
  , child_process = require('child_process')
  , Inotify = false
;

exports.accept = /\/json$/i;

exports.parser = function(info, cb) {
  var CE = this;
  fs.readFile(CE.absPath(), function(err, data){
    var c = {
      image: null,
      description: null,
      name: null,
      url: CE.id
    };
    
    if (err) {
      // error while reading file
      c.error = err;
    }
    else {
      var parsed = {};
      try {
        _.extend(c, info, JSON.parse(data.toString()));
      }
      catch (e) {
        // error while parsing JSON
        c.error = e;
      }
    }

    CE.set(c, {silent: true});

    CE.Kern.log('info', 'analysis', 'CE attributes after parsing', CE.attributes);

    if (_.isFunction(cb)) cb.call(CE, err, c);
  });
};