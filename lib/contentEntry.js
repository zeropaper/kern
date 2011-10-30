var _ = require('underscore')._
  , fs = require('fs')
  , methods = exports
  , xml2js = require('xml2js')
  , http = require('http')
  , url = require('url')
  , child_process = require('child_process')
  , Inotify = require('inotify-plusplus')
;

// following methods are kind of subset of the "path" from nodejs
// should work the same but take no "p" arguments
exports.dirname = function() {
  return require('path').join(this.parents);
};
exports.basename = function(ext) {
  return require('path').basename(this.get('name'), ext);
};
exports.extname = function() {
  return require('path').extname(this.basename());
};
exports.exists = function(cb) {
  require('path').exists(this.absPath(), cb);
};
exports.existsSync = function() {
  return require('path').exists(this.absPath());
};

exports.absPath = function() {
  var absPath = this.get('absPath');
  if (!absPath) absPath = this.Kern.contentDir() +'/'+ this.get('url');
  return absPath;
};
/*
exports.scan = function(absPath) {
  var CE = this
    , isDir = false
    , stats
  ;
  
  absPath = absPath || CE.absPath();
  
  try {
    stats = fs.statSync(absPath);
    isDir = stats.isDirectory();
  } catch(e) {}
  
  if (!stats) return;
  
  if (isDir) {
    if (CE.get('depth') < CE.Kern.settings.crawlMaxDepth) {
      fs.readdir(absPath, function(err, files){
        if (err) {
          console.error(err);
          return;
        }
        
        for (var f in files) {
          if (K.settings.noHidden && files[f].substr(0, 1) == '.') {continue;}
          var exists = false;
          CE.children.each(function(c, i){
            if (c.absPath() == absPath +'/'+ files[f]) exists = i;
          });
          
          if (exists === false) {
            var child = {
              absPath:      absPath +'/'+ files[f],
              name:         files[f],
              hidden:       files[f].substr(0, 1) == '.',
              noMenu:       true,
              depth:        CE.get('depth') + 1,
              parents:      absPath.split(K.contentDir()).pop().split('/'),
            };
            if (child.name == 'index.html') {
              child.hidden = true;
              child.depth--;
            }
            
            CE.children.add(child);
          
          }
          else {
            // exists, should be updated? Don't think so.
            console.info(absPath +'/'+ files[f] +' was found at position '+ exists);
          }
        }
      });
    }
  }
  else {
//    console.info('Analysing '+ CE.absPath());
//    var info = _.clone(CE.attributes);
    var info = CE.attributes;
    
    // computing a hash might not be a so good idea
    //info.hash = crypto.createHash('sha1').update(info.content).digest('hex');
    info.mime = require('mime').lookup(absPath);
    //info.ext = info.name.split('.').pop();
    
    if (!_.isUndefined(parsers) && _.isFunction(parsers[info.mime])) {
      try {
        parsers[info.mime].call(CE, info);
      } 
      catch (e) {
        //console.error('Could not parse '+ info.absPath +' with mime '+ info.mime);
        //console.error(e);
      }
    }
  }
};
*/

exports.scan = function(absPath) {
  var CE = this
    , stats
  ;
  if (!absPath || absPath == 'undefined') absPath = CE.absPath();
  if (!absPath || absPath == 'undefined') return;
  
  absPath = absPath || CE.absPath();
  stats = fs.statSync(absPath);

  if (!stats) return;
  var rec = K.paths[absPath.split(K.contentDir()).join('')];
  
  if (stats.isDirectory()) {
    function readDir(err, files){
      if (err) {
        console.error(err);
        return;
      }
      
      for (var f in files) {
        if (K.settings.noHidden && files[f].substr(0, 1) == '.') {continue;}
        var exists = false;
        CE.children.each(function(c, i){
          if (c.absPath() == absPath +'/'+ files[f]) exists = i;
        });
        
        if (exists === false) {
          var child = {
            absPath:      absPath +'/'+ files[f],
            name:         files[f],
            mime:         require('mime').lookup(files[f]),
            hidden:       files[f].substr(0, 1) == '.',
            noMenu:       true,
            depth:        CE.get('depth') + 1,
            parents:      absPath.split(K.contentDir()).pop().split('/'),
          };
          if (child.name == 'index.html') {
            child.hidden = true;
            child.depth--;
          }
          
          CE.children.add(child);
        
        }
        else {
          // exists, should be updated? Don't think so.
          // console.info(absPath +'/'+ files[f] +' was found at position '+ exists);
        }
      }
    }
    if (CE.get('depth') < CE.Kern.settings.crawlMaxDepth) {
      fs.readdir(absPath, readDir);
    }
    else {
//      CE.children.each();
    }
  }
  else if (typeof rec == 'undefined' || !rec.has('regions')) {
    var info = CE.attributes;
    info.mime = require('mime').lookup(absPath);
    if (!_.isUndefined(parsers) && _.isFunction(parsers[info.mime])) {
      try {
        parsers[info.mime].call(CE, info);
      } 
      catch (e) {
        //console.error('Could not parse '+ info.absPath +' with mime '+ info.mime);
        //console.error(e);
      }
    }
  }
};

exports.watch = function(cb) {
//  if (K.settings.noWatches !== false) return;
  var CE = this;
  if (CE.watched) return;
  var mimeTest = !K.settings.contentWatchExp.test(CE.get('mime'));
  //console.info('Should avoid watching '+ CE.get('mime') +'?', mimeTest, K.settings.contentWatchExp.toString());
  if (mimeTest) return;
  var absPath = CE.absPath() || K.contentDir() + CE.get('url');
  
  
  
  var directives = (function() {
    // private variables
    var count = 0, validate_watch, move, cookies = {};
    
    // shared method
    move = function(ev) {
      var pre = cookies[ev.cookie];
      if (pre) {
        console.log("finished move from " + pre.name + " to " + ev.name);
        cookies[ev.cookie] = undefined;
        delete cookies[ev.cookie];
      }
      else {
        // expires the cookie if the move doesn't complete in this watch
        console.log("began move of " + ev.watch);
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
        console.info("Inotify event triggered on "+ ev.watch, ev);
        //K.paths[ev.watch].trigger(ev);
      },
      /*
      all_events: function(ev) {
        // example ev: { watch: '/path/to/watch', masks: '["access", "move_to"]', cookie: 1, name: 'name_of_file' }
        //validate_watch();
        count += 1;
        console.log("These masks were just activated: '" + ev.masks.toString() + "' for '" + ev.watch + "'. They are now "+ count +" watched");
      },
      access: function(ev) {
        console.log(ev.watch + " was accessed.");
      },
      */
      move_self: true,
      delete_self: true,
      create: true,
      moved_to: move,
      moved_from: move,
      'delete': true
    };
  }());
  K.inotify.watch(directives, absPath);
  
  
  
  
  
  return;
//  if (K.settings.noWatches !== false) return;
  var CE = this;
  if (CE.watched) return;
  var mimeTest = !K.settings.contentWatchExp.test(CE.get('mime'));
  //console.info('Should avoid watching '+ CE.get('mime') +'?', mimeTest, K.settings.contentWatchExp.toString());
  if (mimeTest) return;
  var absPath = CE.absPath() || K.contentDir() + CE.get('url');
  
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
      , text: CE.title() || CE.get('url')
      }, {
        
        socketEvent: 'contentchange'
      , socketData: {
          path: CE.get('url')
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
};


exports.unwatch = function() {
  if (!this.watched) return;
  this.watched = false;
  fs.unwatchFile(this.Kern.contentDir() + this.get('url'));
};


exports.initialize = function(attributes, options) {
  K = typeof K !== 'undefined' ? K : options.Kern;
  
  if (!require('./kern').isKern(K)) {
    console.trace('contentEntry.js initialize() called without Kern', path);
    return {};
  }
  this.Kern = K;
  
  var absPath
    , CE = this
    , exp      = /\.js|\.css|\.nd|~/ig
    , children = this.attributes.children || []
  ;
/*
  CE.bind('initialized', function() {
    if (options.isRoot) {
      K.trigger('initialized');
      console.info('Kern root entry initialized');
    }
  });
*/
  if (options.isRoot) {
    absPath = K.contentDir();
    CE.set({
      absPath: absPath,
      parents: [''],
      title: K.settings.appName,
      name: '',
      depth: 0,
      url: '/'
    }, {silent: true});
    options.isRoot = false;
  }
  else {
    absPath = CE.absPath();
  }
  
  children = _.isArray(children) ? children : _.toArray(children);
  CE.children = new K.collections.ContentChildren(children, options);
  delete CE.attributes.children;
  
  if (absPath && absPath != 'undefined' && !CE.has('error')) CE.scan(absPath);
  
  if (_.isUndefined(CE.get('url')) || CE.get('url') == 'undefined') {
    CE.set({url: absPath.split(K.contentDir()).pop()}, {silent: true});
  }
  /*
  if (!_.isUndefined(CE.get('url'))) {
    CE.attributes.url = (CE.attributes.parents || []).join('/') + '/' + CE.basename();
  }
  */
  //CE.unwatch();
  //if (options.isRoot)
  CE.watch();
  
  CE.bind('change', function(){
    if (K.settings.socketEnabled && !CE.watched) {
      try {
        K.io.sockets.emit('contentchange', {path: CE.get('url')});
      }
      catch(e) {
        console.error(e);
      }
    }
  });
  
  
  _.each(Inotify.watch_for, function(bit, evName) {
    CE.bind(evName, function(ev) {
      console.info("Inotify event triggered on " + CE.title(), ev);
    });
  });

  
  if (_.isUndefined(CE.get('url')) || CE.get('url') == 'undefined') {
    CE.set({url: absPath.split(K.contentDir()).pop()}, {silent: true});
  }
  
  K.paths[CE.get('url')] = CE;
  CE.trigger('initialized');
};

function mediaParser(info, cb) {
  var CE = this
    , cmd = 'LANGUAGE=en extract --hash=sha1 ' + CE.absPath()
  ;
  
  
  require('child_process').exec(cmd, function(error, stdout, stderr) {
    
    if (error) {
      return;//throw error;
    }
    
    info.meta = {};
    _.each(stdout.toString().split("\n"), function(val, key) {
      var name = val.split(' - ').shift().toLowerCase()
        , value = val.split(' - ').pop()
      ;
      
      if (!val.split(' - ').shift()) return;
      if (name == 'size' && value.toLowerCase().split('x') == 2) {
        var parts = value.toLowerCase().split('x');
        info.meta.width = parts[0];
        info.meta.height = parts[1];
      }
      
      info.meta[name] = value;
    });
    
    delete info[''];
    info.mime = info.meta.mimetype;
    delete info.meta.mimetype;
    
    
    info.regions = info.regions || {};
    info.regions.main = 'Screwed';
    
    var body = ''
      , URL = info.parents.join('/') +'/'+ info.name
    ;
    if (/^image\//ig.test(info.mime)) {
      info.regions.main = '<img src="'+ URL +'" class="original" />';
    }
    else if (/^video\//ig.test(info.mime)) {
      info.regions.main = '<video><source src="'+ URL +'" type="'+info.mime+'" /></video>';
    }
    else if (/^audio\//ig.test(info.mime)) {
      info.regions.main = '<audio><source src="'+ URL +'" type="'+info.mime+'" /></audio>';
    }
    
    CE.set(info, {silent: true});
  });
};

var parsers = {
  'video/x-ms-wmv': mediaParser,
  'image/jpeg': mediaParser,
  'image/jpg': mediaParser,
  'image/png': mediaParser,
  'image/gif': mediaParser,
  'application/x-shockwave-flash': mediaParser,
  
  'text/html': function(info) {
    var CE = this;
    fs.readFile(CE.absPath(), function(err, data){
      if (err) return;//throw err;
      CE.set(K.analyse(data.toString()), {silent: true});
    });
  },
  'text/plain': function(info, cb) {
    var CE = this
      , content = ''
    ;
    fs.readFile(info.absPath, function (err, data) {
      if (err) return;//throw err;
      data = data.toString();
      
      try {
        switch (info.ext) {
          case 'md':
          case 'markdown':
            var md = require("node-markdown").Markdown;
            content = md(data);
            //console.info('Markdown parsing content of '+ info.name, content);
            break;
          case 'txt':
          case 'readme':
            content = '<pre>'+ data +'</pre>';
            break;
          case 'php':
          case 'rb':
          case 'inc':
          case 'js':
          case 'coffee':
            var hl = require("highlight").Highlight;
            content = hl(data);
            //console.info('Highlighting content of '+ info.name, content);
            break;
        }
        
        if (content != data) {
          content = '<div role="document-body"><div class="parsed">'+ content +'</div>';
          content += '<form class="unparsed-content"><div class="inner"><textarea name="content">'+ data +'</textarea></div></form></div>';
        }
        //console.info('', content);
        CE.set(K.analyse(content), {silent: true});
      }
      catch (e) {
        // console.error(e);
        CE.set({
          title: 'Parsing error',
          regions: {
            main: e.message
          }
        });
      }
      
    });
  }
};

