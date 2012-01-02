var sys = require('util')
  , exec = require('child_process').exec
  , _s = require('underscore.string')
  , fs = require('fs')
;




exports.compassWatch = function(projectDir) {
  var K = this
    , lastChange
  ;
  
  
  
  if (K._compassWatched) {
    K.log('debug', 'compass', 'The compass project in '+ K.publicDir() +' is already watched');
    return false;
  }
  K._compassWatched = true;
  
  projectDir = projectDir || K.publicDir();
  
  function recurseWatch(path) {
    if (fs.statSync(path).isDirectory()) {
      fs.readdir(path, function(err, files){
        if (err) return;
        for (var f in files) {
          if (files[f].substr(0, 1) == '.') continue;
          recurseWatch(path +'/'+ files[f], changed);
        }
      });
    }
    else {
      fs.watchFile(path, function(curr, prev){
        changed(path, curr, prev);
      });
      K.log('debug', 'compass', 'Watching '+ path);
    }
  }
  
  function changed(path, curr, prev) {
    if (curr.mtime == prev.mtime || lastChange == curr.mtime) return;
    K.log('info', path +' has changed');
    //fs.unwatchFile(path);
    // preventing double compiling
    // when adding/removing file from a watched directory
    lastChange = curr.mtime;
    
    
    // @todo need something when adding/removing files
    // recurseWatch(new file path);
    
    try {
      exec("compass compile "+ projectDir +" -e development", function(error, stdout, stderr) {
        if (error) {
          K.log('error', error);
          return;
        }
        K.log('debug', 'compass', 'Compass project recompiled');
      });
    }
    catch(e) {
      K.log('debug', 'compass', 'A sass file has changed but an error occured while compiling');
      K.log('error', 'compass', e);
    }
  }
  
  fs.readFile(projectDir +'/config.rb', function (err, data) {
    if (err) {
      K.log('error', 'compass', 'Could not read '+ projectDir +'/config.rb');
      return;
    }
    data = data.toString();
    var lines = data.split("\n");
    var info = {};
    for (var l in lines) {
      var line = _s.trim(lines[l]);
      if (!line.length || lines[l].substr(0, 1) == '#' || line.indexOf('=') == -1) continue;
      var val = _s.trim(line.split('=').pop());
      info[_s.trim(line.split('=').shift())] = val.substr(1, val.length - 2);
    }
    
    if (info.sass_dir) {
      recurseWatch(info.sass_dir, changed);
    }
  });
};