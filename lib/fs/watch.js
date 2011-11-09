
  /*
//  if (K.settings.noWatches !== false) return;
  var CE = this;
  if (CE.watched) return;
  var mimeTest = !K.settings.contentWatchExp.test(CE.get('mime'));
  //console.info('Should avoid watching '+ CE.get('mime') +'?', mimeTest, K.settings.contentWatchExp.toString());
  if (mimeTest) return;
  var absPath = CE.absPath() || K.contentDir() + CE.id;
  
  function changed(){
    
  };
  
  if (typeof cb != 'function') {
    cb = function(curr, prev){
      if (curr.mtime == prev.mtime) return;
      
      if (!K.settings.socketEnabled || _.isUndefined(K.io)) return;
      console.info('Propagating changes');

      CE.scan(CE.absPath);
      
      // send a notification, to the OS and the socket
      K.notify(null, {
        title: 'The following content has changed'
      , text: CE.title() || CE.id
      }, {
        
        socketEvent: 'contentchange'
      , socketData: {
          path: CE.id
        }
      });
      
    };
  }
  
  try {
    fs.unwatchFile(absPath);
  } catch (e) {
    console.error(e);
    console.info('Can not unwatch...');
  };
  
  this.watched = true;
  //console.info('Start watching '+ absPath);
  fs.watchFile(absPath, cb);
  */