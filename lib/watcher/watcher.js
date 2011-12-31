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

function watch(abspath) {
  if (isWatchable(abspath)) return;
  var K = this;
  watched[abspath] = true;
  
  fs.watchFile(abspath, function(c, p) {
    var CE = K.paths[abspath.split(K.contentDir()).join('')];
    K.log('info', 'watcher', 'Change detected on', abspath, CE.id);
    changedCE.call(CE, c, p);
  });
  
}


function eventDispatch() {
  
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
  });
};
