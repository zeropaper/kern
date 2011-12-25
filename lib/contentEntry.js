var _ = require('underscore')._
  , fs = require('fs')
  , methods = exports
  //, xml2js = require('xml2js')
  , http = require('http')
  , url = require('url')
  , path = require('path')
  , child_process = require('child_process')
  , Inotify = false
;

// try {
//   Inotify = require('inotify-plusplus');
// }
// catch (e) {
//   console.error(e);
// }

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
exports.isDir = function() {
  return _.isFunction(this.isDirectory) ? this.isDirectory() : false;
};
exports.absPath = function() {
  // return this.Kern.contentDir() + (this.get('parents') || []).join('/') +'/'+ this.get('name');
  // return path.normalize(this.Kern.contentDir() + this.id);
  return path.normalize(this.Kern.contentDir() + (this.get('parents') || []).join('/') +'/'+ this.get('name'));
};


function repeat(s, n){
  var a = [];
  while(a.length < n){
      a.push(s);
  }
  return a.join('');
}

exports.scan = function() {
  var CE = this
    , absPath = CE.absPath()
    , stats = fs.statSync(CE.absPath())
  ;
  

  if (!stats) return CE.set({error: new Error('Can not stat')}, {silent: true});
  _.extend(this, stats);

  console.info(repeat('-', CE.get('depth')) +' Scanning '+ path.basename(absPath));
  
  var rec = K.paths[CE.id];
  
  if (this.isDir()) {
    this.unset('mime', {silent: true});
    function readDir(err, files){
      if (err) return CE.set({error: err}, {silent: true});
      
      for (var f in files) {
        var isHidden = files[f].substr(0, 1) == '.';
        if ((isHidden && K.settings.noHidden === false) || !isHidden) {
          //console.info(repeat('-', CE.get('depth')) +" Is hidden?", files[f], files[f].substr(0, 1) == '.');
          var exists = false;
          CE.children.each(function(c, i){
            if (c.absPath() == absPath +'/'+ files[f]) exists = i;
          });
          
          if (exists === false) {
            var child = {
              // absPath:      absPath +'/'+ files[f],
              name:         files[f],
              mime:         require('mime').lookup(files[f]),
              hidden:       files[f].substr(0, 1) == '.',
              noMenu:       isHidden,
              depth:        CE.get('depth') + 1,
              parents:      absPath.split(K.contentDir()).pop().split('/'),
            };
            if (child.name == 'index.html') {
              child.hidden = true;
              child.depth--;
            }
            
            child.id = path.normalize(child.parents.join('/') + '/' + child.name);
            
            CE.children.add(child);
          
          }
          else {
            // exists, should be updated? Don't think so.
            // console.info(absPath +'/'+ files[f] +' was found at position '+ exists);
          }
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
    var parsers = require('./content/parsers/index');
    var parser = parsers.atPath(absPath);
    
    if (_.isFunction(parser)) {
      parser.call(CE, info, function(err, collected){
        if (err) return;
        CE.set(collected, {silent: false});
      });
    }
  }
};



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






exports.registerPath = function() {
  var CE = this, K = CE.Kern;
  if (CE.error || CE.isNew() || (CE.has('hidden') && CE.get('hidden'))) return;
  var path = CE.id.substr(1, CE.id.length);
  // debugger;
  if (!_.find(K.app.routes.routes.get, function(p){
    return path == p.path;
  })) {
    //console.info('Registering content entry path '+ f);
//    K.app.get(CE.id.replace(/(\(|\))/g, '\\('), K.pathRequestCallback);
    // K.app.get(CE.id, K.sendContent);
  }
  
/*
  if (!_.find(K.app.routes.routes.get, function(p){
    return escape(CE.id) == p.path;
  })) {
    //console.info('Registering exscaped content entry path '+ escape(CE.id));
    K.app.get(escape(CE.id), K.pathRequestCallback);
    // K.app.get(escape(CE.id), K.sendContent);
  }
*/
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
  

  CE.unset('url');


  if (options.isRoot) {
    absPath = K.contentDir();
    CE.set({
      absPath   : absPath,
      parents   : [''],
      title     : K.settings.appName,
      name      : '',
      depth     : 0,
      url       : '/'
    }, {
      silent    : true
    });
    
    CE.bind('initialized', function() {
      K.trigger('initialized');
      debugger;
      console.info('------------ Kern root entry initialized ------------');
    });
    
    options.isRoot = false;
  }
  else {
    absPath = CE.absPath();
  }
  
  if (CE.has('error')) return CE.trigger('initialized');
  
  CE.bind('initialized', function() {
    this.registerPath();
  });
  
  
  
  
  
  if (CE.has('url') && !_.isUndefined(K.paths[CE.id])) throw new K.errors.InternalServerError('The content entry '+CE.id+' is already registered');
  K.paths[CE.id] = CE;
  
  children = _.isArray(children) ? children : _.toArray(children || []);
  CE.children = new K.collections.ContentChildren(children, options);
  delete CE.attributes.children;
  
  K.trigger('contentprepare', CE);
  var isHidden = path.basename(absPath).substr(0, 1) == '.';
  if ((isHidden && K.settings.noHidden === false) || !isHidden) CE.scan();
  
  // if (_.isUndefined(CE.id) || CE.id == 'undefined') {
  //   CE.set({url: absPath.split(K.contentDir()).pop()}, {silent: true});
  // }
  
  CE.watch();
  
  if (K.settings.socketEnabled) {
    if (!CE.watched) {
      CE.bind('change', function(){
        K.io.sockets.emit('contentchange', {path: CE.id});
      });
    }
    
    CE.bind('contentparsed', function(){
      K.io.sockets.emit('contentparsed', {
        path: CE.id,
        title: CE.title(),
        cover: CE.cover()
      });
    });
  }
  
  if (Inotify) {
    _.each(Inotify.watch_for, function(bit, evName) {
      CE.bind(evName, function(ev) {
        console.info("Inotify event triggered on " + CE.title(), ev);
      });
    });
  }
  
  
  if (_.isUndefined(CE.id) || CE.id == 'undefined') {
    CE.set({url: '/'}, {silent: true});
  }
  
  CE.trigger('initialized');
  K.trigger('registerpath', CE);
};































