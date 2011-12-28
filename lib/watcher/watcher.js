exports.extensionName = 'watcher';


var watched = {}
  , _ = require('underscore')._
  , fs = require('fs')
  , Inotify = false
;

try {
  Inotify = require('inotify-plusplus');
}
catch (e) {
  console.error(e);
}




function changed(curr, prev) {
  if (curr.mtime == prev.mtime) return;
  fs.unwatchFile(K.publicDir() + '/css/style.css');
  K.notify(null, {
    title: 'The following assets have changed'
  , text: '/css/style.css'
  }, {
    callback: function(){
      console.info('RE-Starting watching style.css');
      fs.watchFile(K.publicDir() + '/css/style.css', changed);
    }
  , socketEvent: 'assetchange'
  , socketData: {
      styles: [
        {
          href: '/css/style.css'
        }
      ]
    }
  });
};



function isWatchable(CE) {
  
}

function isWatched(CE) {
  
}

function watch(cb) {
  if (Inotify) {
    K.log('debug', 'watcher', 'Inotify++ will be used');
    
    _.each(Inotify.watch_for, function(bit, evName) {
      CE.bind(evName, function(ev) {
        K.log('debug', 'watcher', "Inotify event triggered on " + CE.title(), ev);
      });
    });
    
  }
  else {
    K.log('debug', 'watcher', 'Inotify++ can not be used');
    
  }
}

function unwatch() {
  if (Inotify) {
    
  }
  else {
    
  }
}


function eventDispatch() {
  
}


exports.extender = function() {
  var K = this;
  if (_.isUndefined(K.app)) 
    return;
  
  K.log('debug', 'watcher', 'Extending Kern, server side');

  K.bind('contentchange', function(CE) {
    
  });
};








/*
exports.watch = function(cb) {
//  if (K.settings.noWatches !== false) return;
  var CE = this;
  if (!CE.watchable() && _.isFunction(CE.isDirectory)) return;
  var absPath = CE.absPath() || K.contentDir() + CE.id;
  if (!absPath) return;
  
  
  
  var directives = (function() {
    // private variables
    var count = 0, validate_watch, move, cookies = {};
    
    // shared method
    move = function(ev) {
      var pre = cookies[ev.cookie];
      if (pre) {
        //console.log("finished move from " + pre.name + " to " + ev.name);
        cookies[ev.cookie] = undefined;
        delete cookies[ev.cookie];
      }
      else {
        // expires the cookie if the move doesn't complete in this watch
        //console.log("began move of " + ev.watch);
        cookies[ev.cookie] = ev;
        setTimeout(function() {
          cookies[ev.cookie] = undefined;
          delete cookies[ev.cookie];
        }, 500);
      }
    };
    
    // will listen to three events
    // multiple events may fire at the same time
    return {
      all_events: function(ev) {
        //console.info("Inotify event triggered on "+ ev.watch, ev);
        //K.paths[ev.watch].trigger(ev);
      },
      // all_events: function(ev) {
      //   // example ev: { watch: '/path/to/watch', masks: '["access", "move_to"]', cookie: 1, name: 'name_of_file' }
      //   //validate_watch();
      //   count += 1;
      //   console.log("These masks were just activated: '" + ev.masks.toString() + "' for '" + ev.watch + "'. They are now "+ count +" watched");
      // },
      // access: function(ev) {
      //   console.log(ev.watch + " was accessed.");
      // },
      move_self: true,
      delete_self: true,
      create: true,
      moved_to: move,
      moved_from: move,
      'delete': true
    };
  }());
  
  
  
  if (_.isUndefined(K.inotify) && Inotify) {
    K.inotify = Inotify.create(true);//throw new Error("Kern.inotify is undefined");
    // console.info('Will be watched: '+ CE.cid +"\t"+ absPath);
    K.inotify.watch(directives, absPath);
    CE.watched = true;
  }
};


exports.unwatch = function() {
  if (!this.watched) return;
  this.watched = false;
  //fs.unwatchFile(this.Kern.contentDir() + this.get('url'));
};
*/