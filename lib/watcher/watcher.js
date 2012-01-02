exports.extensionName = 'watcher';


var watched = {}
  , _ = require('underscore')._
  , fs = require('fs')
  , watched = {}
;


function changedCE(curr, prev) {
  if (curr.mtime == prev.mtime) return;
  var CE = this;
  var K = CE.Kern;
  K.log('info', 'watcher', 'changes detected', CE.id, curr, prev);
  fs.unwatchFile(CE.absPath());
  
  CE.scan(function(err) {
    K.log('debug', 'content', 'Scanned '+ CE.absPath());
    if (err) return K.log('error', 'watcher', 'Error while scanning '+ CE.absPath());
    fs.watchFile(CE.absPath(), function(c, p){
      changedCE.call(CE, c, p);
    });
  });
};



function isWatchable(abspath) {
  if (watched[abspath]) return false;
}

function isWatched(abspath) {
  return watched[abspath] || false;
}

function unwatch(abspath) {
  if (!isWatched(abspath)) return;
  watched[abspath] = false;
  fs.unwatchFile(abspath);
}

function contentEntry(abspath) {
  return this.paths[abspath.split(this.contentDir()).join('')] || false;
}

function watch(abspath) {
  if (isWatchable(abspath)) return;
  var K = this;
  watched[abspath] = true;
  
  fs.watchFile(abspath, function(c, p) {
    K.log('info', 'watcher', 'Change detected on '+ abspath);

    var CE = contentEntry.call(K, abspath);
    if (CE) {
      K.log('info', 'watcher', 'Content');
      changedCE.call(CE, c, p);
    }
    else {
      var A = K.assetFromFilepath(abspath);
      K.log('info', 'watcher', 'Asset');
      if (A) K.trigger('assetchange', A);
    }
  });
  
}


exports.extender = function() {
  var K = this;
  if (_.isUndefined(K.app)) 
    return;

  
  K.log('debug', 'watcher', 'Extending Kern, server side');

  K.bind('newcontent', function(CE) {
    K.log('debug', 'watcher', 'Content added', CE.absPath());
    watch.call(K, CE.absPath());
  });
  
  K.bind('extended', function() {
    K.log('debug', 'watcher', 'Watchers', watched);

    K.log('info', 'watcher', 'Watching assets');
    _.each(K.assets, function(type, typeName) {
      _.each(type, function(asset, clientPath){
        if (_.isUndefined(asset.filepath)) return;
        K.log('info', 'assets', 'Watching '+ typeName, asset.filepath, clientPath);
        watch.call(K, asset.filepath);
      });
    });
  });
};
