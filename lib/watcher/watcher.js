exports.extensionName = 'watcher';


var watched = {}
  , _ = require('underscore')._
  , fs = require('fs')
  , watched = {}
;


function changedCE(curr, prev) {
  // if (curr.mtime == prev.mtime) return;
  var CE = this
    , K = CE.Kern
  ;
  
  
  if (!CE.existsSync()) {
    console.info('The file '+ CE.id +' does not exists anymore');
    // TODO: override the destroy method on server side (it triggers a ajax call)
    try {
      CE.destroy({
        success: function(model, response) {
          console.error('Model '+ CE.id +' destroyed');
        },
        error: function(model, response) {
          console.error('Model '+ CE.id +' could not be destroyed');
        }
      });
    }
    catch (e) {
      console.error(e);
    }
  }
  
  var K = CE.Kern;
  
  fs.unwatchFile(CE.absPath());
  
  CE.scan(function(err) {
    if (err) return 
    fs.watchFile(CE.absPath(), function(c, p){
      changedCE.call(CE, c, p);
    });
  }, false);
};



function isWatchable(abspath) {
  return !watched[abspath];
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
  if (!isWatchable(abspath)) return;
  var K = this;
  watched[abspath] = true;
  
//  console.info("Start watching "+ abspath);

  fs.watchFile(abspath, function(c, p) {
    if (c.mtime == p.mtime) return;
    console.info('Changes detected on '+ abspath);
    var CE = contentEntry.call(K, abspath);
    if (CE) {
      console.info('Content file changed', CE.id);
      changedCE.call(CE, c, p);
    }
    else {
      var A = K.assetFromFilepath(abspath);
      console.info('Asset file changed', A);
      if (A) K.trigger('assetchange', A);
    }
  });
  
}


exports.extender = function() {
  var K = this;
  if (_.isUndefined(K.app)) 
    return;

  
  

  K.bind('newcontent', function(CE) {
    
    watch.call(K, CE.absPath());
  });
  
  K.bind('extended', function() {
    

    
    _.each(K.assets, function(type, typeName) {
      _.each(type, function(asset, clientPath){
        if (_.isUndefined(asset.filepath)) return;
        
        watch.call(K, asset.filepath);
      });
    });
  });
};
