var sys = require('sys')
  , exec = require('child_process').exec
  , _s = require('underscore.string')
  , fs = require('fs')
;




exports.compassWatch = function() {
  var K = this
    , lastChange
  ;
  if (K._compassWatched) {
    console.info('The compass project in '+ K.publicDir() +' is already watched');
    return false;
  }
  K._compassWatched = true;
  
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
      console.info('Watching compass file '+ path);
    }
  }
  
  function changed(path, curr, prev) {
    if (curr.mtime == prev.mtime || lastChange == curr.mtime) return;
    console.info(path +' has changed');
    //fs.unwatchFile(path);
    // preventing double compiling
    // when adding/removing file from a watched directory
    lastChange = curr.mtime;
    
    
    // @todo need something when adding/removing files
    // recurseWatch(new file path);
    
    try {
      exec("compass compile "+ K.publicDir() +" -e production", function(error, stdout, stderr) {
        if (error) {
          console.error(error);
          return;
        }
        console.info('Compass project recompiled');
      });
    }
    catch(e) {
      console.info('A sass file has changed but an error occured while compiling');
      console.error(e);
    }
    /*
    fs.watchFile(path, function(curr, prev){
      changed(path, curr, prev);
    });
    */
  }
  
  fs.readFile(K.publicDir() +'/config.rb', function (err, data) {
    if (err) {
      console.error('Could not read '+ K.publicDir() +'/config.rb');
      return;
    }
    data = data.toString();
    //console.info("Content of config.rb\n", data);
    var lines = data.split("\n");
    var info = {};
    for (var l in lines) {
      var line = _s.trim(lines[l]);
      if (!line.length || lines[l].substr(0, 1) == '#' || line.indexOf('=') == -1) continue;
      var val = _s.trim(line.split('=').pop());
      info[_s.trim(line.split('=').shift())] = val.substr(1, val.length - 2);
    }
    console.info("The config.rb contains\n", info);
    
    if (info.sass_dir) {
      recurseWatch(K.publicDir() +'/'+ info.sass_dir, changed);
    }
  });
};