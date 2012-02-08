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
    
    return false;
  }
  K._compassWatched = true;
  
  projectDir = projectDir || K.publicDir();
  
  function recurseWatch(path) {
    var stats = false;
    try {
      fs.statSync(path);
    } catch(e) {
      
    }
    if (stats && stats.isDirectory()) {
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
      
    }
  }
  
  function changed(path, curr, prev) {
    if (curr.mtime == prev.mtime || lastChange == curr.mtime) return;
    
    //fs.unwatchFile(path);
    // preventing double compiling
    // when adding/removing file from a watched directory
    lastChange = curr.mtime;
    
    
    // @todo need something when adding/removing files
    // recurseWatch(new file path);
    
    try {
      exec("compass compile "+ projectDir +" -e development", function(error, stdout, stderr) {
        if (error) {
          
          return;
        }
        
      });
    }
    catch(e) {
      
      
    }
  }
  
  fs.readFile(projectDir +'/config.rb', function (err, data) {
    if (err) {
      
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