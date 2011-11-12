var _ = require('underscore')._
  , fs = require('fs')
  , methods = exports
  , xml2js = require('xml2js')
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

exports.scan = function(absPath) {
  var CE = this
    , stats
    , absPath = CE.absPath()
    , stats = fs.statSync(CE.absPath())
  ;

  if (!stats) return CE.set({error: new Error('Can not stat')}, {silent: true});
  _.extend(this, stats);

  var rec = K.paths[CE.id];
  
  if (this.isDir()) {
    this.unset('mime', {silent: true});
    function readDir(err, files){
      if (err) return CE.set({error: err}, {silent: true});
      
      for (var f in files) {
        if (K.settings.noHidden && files[f].substr(0, 1) == '.') {continue;}
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
            noMenu:       true,
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
    K.app.get(CE.id, K.pathRequestCallback);
    // K.app.get(CE.id, K.sendContent);
  }
  

  if (!_.find(K.app.routes.routes.get, function(p){
    return escape(CE.id) == p.path;
  })) {
    //console.info('Registering exscaped content entry path '+ escape(CE.id));
    K.app.get(escape(CE.id), K.pathRequestCallback);
    // K.app.get(escape(CE.id), K.sendContent);
  }

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
  if (absPath && absPath != 'undefined') CE.scan(absPath);
  
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
  
  K
  CE.trigger('initialized');
  K.trigger('registerpath', CE);
};

































function mediaParser(info, cb) {
  var CE = this
    // , cmd = 'LANGUAGE=en extract --hash=sha1 ' + CE.absPath().split(' ').join('\\ ')
    , cmd = 'LANGUAGE=en extract --hash=sha1 "' + CE.absPath().absPath().split(' ').join('\\ ').absPath().split('$').join('\\$') + '"'
  ;
  
  require('child_process').exec(cmd, function(error, stdout, stderr) {
    
    if (error) return;
    
    info.meta = {};
    console.info('stdout.toString()', stdout.toString());
    _.each(stdout.toString().split("\n"), function(val, key, list) {
      var name = val.split(' - ').shift().toLowerCase()
        , value = val.split(' - ').pop()
      ;
      if (!name) return;
      console.info('name, value', "'"+name+"'", "'"+value+"'");
      if (name == 'size') {
        var parts = value.toLowerCase().split('x');
        list.width = info.meta.width = parts[0];
        list.height = info.meta.height = parts[1];
      }
      
      list[name] = info.meta[name] = value;
    });
    
    delete info[''];
    info.mime = info.meta.mimetype;
    delete info.meta.mimetype;
    
    info.regions = info.regions || {};
    info.regions.main = 'Screwed';
    
    var body = ''
      , URL = info.parents.join('/') +'/'+ info.name
    ;
    if (/^image\//i.test(info.mime)) {
      info.regions.main = '<img src="/i/same'+ URL +'" class="original" />';
    }
    else if (/^video\//i.test(info.mime)) {
      info.regions.main = '<video><source src="/av/same'+ URL +'" type="'+info.mime+'" /></video>';
    }
    else if (/^audio\//i.test(info.mime)) {
      info.regions.main = '<audio><source src="/av/same'+ URL +'" type="'+info.mime+'" /></audio>';
    }
    
    CE.Kern.trigger('contentparsed', CE);
    
    CE.set(info, {silent: false});
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
        CE.set(K.analyse(content), {silent: true});
      }
      catch (e) {
        // console.error(e);
        CE.set({
          error: e,
          title: 'Parsing error',
          regions: {
            main: e.message
          }
        }, {silent: true});
      }
      
    });
  }
};

