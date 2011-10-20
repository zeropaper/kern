var _ = require('underscore')._
  , fs = require('fs')
  , methods = exports;

_.extend(methods, require('./common/methods'));
_.extend(methods, require('./sys'));

methods.fs = require('./fs/fs');


var commonFS = require('./common/methods').fs;
methods.fs = _.extend(commonFS, methods.fs);
methods.onServer = true;

methods.contentDir = function(newPath) {
  if (_.isString(newPath)) {
    if (fs.stat(newPath).isDirectory()) {
      this.settings.contentDir = newPath;
      this.struct = new this.models.contentEntry({}, {
        Kern: this,
        isRoot: true
      });
    }
    else {
      console.error(newPath +' is not a directory');
    }
  }
  return this.settings.contentDir;
};

methods.publicDir = function() {
  return this.settings.publicDir;
};

methods.cacheDir = function() {
  return this.settings.cacheDir;
};


methods.initialize = function() {
  // console.info('Kern is initializing on the server side');
  if (!require('./kern').Kern.isKern(this)) {
    throw new Error({
      message: 'Not a valid Kern object'
    });
  }
  
  var express = require('express')
    , app = express.createServer()
    , fs = require('fs')
    , K = this
    , S = K.settings
  ;
  
  
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.cookieParser());
  //app.use(express.vhost('irata.loc'));
  
  
  // session handling if settings are defined
  if (typeof S.session == 'object') {
    var MemoryStore = express.session.MemoryStore;
    app.use(express.session(_.extend({
      store: new MemoryStore()
    }, S.session)));
  }
  
  app.use(app.router);
  app.configure('development', function() {
    app.use(express.errorHandler({
      dumpExceptions: true,
      showStack: true
    }));
  });
  
  app.configure('production', function() {
    app.use(express.errorHandler());
  });
  
  app.registerDefault = 'html';
  app.register('html', require('./fs/delivery'));
  app.set('views', S.publicDir);
  
  K.app = app;
  //K.sio = require('socket.io');
  
  K.assets = {};
  K.assets.styles = {
    '/js/lib/jquery-ui/themes/base/jquery.ui.all.css': {
      weight: -50
    },
    /*
    'jquery.ui.notify': {
      href: '/js/lib/jquery-notify/ui.notify.css',
      weight: -50
    },
    */
    '/css/style.css': {
      weight: 50
    }
  };
  
  K.assets.scripts = {
    '/js/lib/modernizr.min.js': {
      weight: -100
    },
    '/js/lib/respond.min.js': {
      weight: -99
    },
    '/js/lib/underscore.js': {
      weight: -98
    },
    
    
    '/js/lib/jquery.min.js': {
      weight: -97
    },
    
    
    '/js/lib/backbone.js': {
      weight: -96
    },
    '/js/lib/backbone-localstorage.js': {
      weight: -95
    },
    
    '/js/lib/jquery-ui/ui/jquery.ui.core.js': {
      weight: -94
    },
    '/js/lib/jquery-ui/ui/jquery.ui.widget.js': {
      weight: -93
    },
    '/js/lib/jquery-notify/src/jquery.notify.min.js': {
      weight: -92
    },
    
    '/js/script.js': {
      weight: 50
    }
  };
  
  
  if (K.settings.socketEnabled) {
    K.assets.scripts['/socket.io/socket.io.js'] = {
      weight: -50
    };
    K.connected = {};
  }
  
  
  _.extend(K.assets.scripts, {
    '/kern.methods.js': {
      weight: -5
    },
    '/kern.bone.js': {
      weight: -4
    },
    '/kern.js': {
      weight: 0
    },
//    '/kern.min.js': {},
  });
  
  
  
  
  K.struct = new K.models.ContentEntry({}, {Kern: K, isRoot: true});
};

  

methods.notify = function(tmpl, vars, opt){
  K = K || this;
  var args = _.toArray(arguments);
  /*
  if (!_.isString(tmpl)) {
    var tmpl = 'notification';
    vars = args[0] || {};
    opt = args[1] || {};
  }
  */
  vars = vars || {};
  opt = opt || {};
  
  console.info(tmpl, vars, opt);
  try {
    var args = [
        "-u", opt.urgency || "normal"
      , "-i", K.publicDir() +"/apple-touch-icon.png"
      ];
    args.push('"'+ (vars.title || '').split(' ').join('\ ') +'"');
    args.push('"'+ (vars.text || '').split(' ').join('\ ') +'"');
    require('child_process').exec("notify-send "+ args.join(' '));
  }
  catch (e) {
    console.error(e);
    console.trace();
  }
  if (opt.socketEvent) {
    try {
      K.io.sockets.emit(opt.socketEvent, opt.socketData || {});
    }
    catch(e) {
      console.error(e);
    }
  }
};


methods.compassWatch = function() {
  var sys = require('sys')
    , K = this
    , exec = require('child_process').exec
    , _s = require('underscore.string')
    , lastChange
  ;
  if (K._compassWatched) {
    console.info('The compass project in '+ K.publicDir() +' is already watched');
    return false;
  }
  K._compassWatched = true;
  
  function recurseWatch(path) {
    fs.watchFile(path, changed);
    console.info('Watching compass file '+ path);
    if (fs.statSync(path).isDirectory()) {
      fs.readdir(path, function(err, files){
        if (err) return;
        for (var f in files) {
          if (files[f].substr(0, 1) == '.') continue;
          recurseWatch(path +'/'+ files[f], changed);
        }
      });
    }
  }
  
  function changed(curr, prev) {
    if (curr.mtime == prev.mtime || lastChange == curr.mtime) return;
    // preventing double compiling
    // when adding/removing file from a watched directory
    lastChange = curr.mtime;
    
    
    // @todo need something when adding/removing files
    // recurseWatch(new file path);
    
    try {
      exec("compass compile "+ K.publicDir(), function(error, stdout, stderr) {
        if (error) {
          console.error(error);
          return;
        }
        /*
        K.notify(null, {
          title: 'The following content has changed'
        , text: CE.title() || CE.get('url')
        }, {
          socketEvent: 'contentchange'
        , socketData: {
            path: CE.get('url')
          }
        });
        */
        console.info('Compass project recompiled');
      });
    }
    catch(e) {
      console.info('A sass file has changed but an error occured while compiling');
      console.error(e);
    }
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


methods.manifest = function(){
  var K = this;
  var cache = {
    '# rev ': [],
    'CACHE:': [],
    'FALLBACK:': [],
    'NETWORK:': []
  };
  _.each(K.assets, function(assets, type){
    _.each(assets, function(info, url){
      var section = info.section || '# rev ';
      cache[section] = cache[section] || [];
      
      if (url.substr(0, 1) == '/') {
        cache[section].push(url);
      }
      
    });
  });
  
  var lines = ['CACHE MANIFEST'];
  for (var section in cache) {
    lines.push('# '+ section +', '+ cache[section].length);
    if (cache[section].length) {
      lines.push(section +(section == '# rev ' ? K.started() : ''));
      lines = _.union(lines, cache[section]);
    }
  }
  return lines.join("\n");
};







methods.sendContent = function(req, res, next) {
  if (!require('./kern').isKern(this)) {
    console.error(this);
    return next(new Error('Not a valid Kern object'));
  }
  
  var url = req.url
    , K = this
    , S = K.settings
    , ext = url.split('/').pop().split('?').shift().split('.').pop()
    , exp = S.staticExtExp
    , staticDelivery = exp.test(ext)
  ;
  
  if (S.redirectDirIndex) {
    if (K.paths[req.url+'/index.html']) {
      return res.redirect(req.url+'/index.html');
    }
    else if (K.paths[req.url+'index.html']) {
      return res.redirect(req.url+'index.html');
    }
  }
  else if (S.redirectIndexDir) {
    // @todo some regexp...
    if (req.url.split('/index.html').length == 2) {
      return res.redirect(req.url.split('/index.html').shift());
    }
  }
  
  console.info('Url: ' + url + ', extension: ' + ext + ', static: ', staticDelivery);
  
  if (staticDelivery) {
    if (S.staticUseCDN) {
      var cdnURL = 'http://'+ S.staticHostname + (S.staticPort != 80 ? S.staticPort : '') + S.staticPath
      console.info('Redirecting to cdnURL '+cdnURL);
      return res.redirect(cdnURL, 301);
    }
    K.log('info', ' ----- Delivering staticaly');
    return res.sendfile(K.contentDir() + url.split('?').shift(), function(err, data) {
      if (err) return next(err);
    });
  }
  
  console.info("\n\n\n***********************************************************\n\n\n");
  
  res.send(K.applyFile(req.url, req, next));
};

methods.loadLayout = function(cb, path) {
  K = K || this;
  K.$ = $ = $ || K.$ || require('jquery');
  var path = path || K.publicDir() +'/layout.html';
  var layout = fs.readFileSync(path).toString()
    , $layout = $(layout)
  ;
  
  $('body').replaceWith($layout.children('body'));
  $('head').replaceWith($layout.children('head'));
  if (typeof cb == 'function') cb.call(K);
}

methods.loadTemplate = function() {
  
}


/**
 * Function methods.applyFile
 * Apply the information about a file into the page
 */
methods.applyFile = function(fileURL, req, next) {
  fileURL = unescape(fileURL);
  K = K || this;
  K.$ = $ = $ || K.$ || require('jquery');
  
  file = _.isString(fileURL) ? K.paths[fileURL] : false;
  if (!file || !_.isFunction(file.get)) throw new Error('Could not load "'+ fileURL +'"');
  file = K.findIndex(file);
  
  var options = {
    file: file,
    root: file.get('url'),
    files: K.struct.toJSON(),
    Kern: K
  };
  
  if (file.children.length && !file.get('regions')) {
    file.set({
      regions: { main: K.renderEntryChildren(options) }
    }, {silent: true});
  }
    
  K.loadLayout(function() { console.info('Loaded layout', this.$('body').length > 0); });
  K.apply(file);
    
  try {
    methods.renderBreadcrumb(_.extend({}, options, {
      current: options.current,
      $el: $('#breadcrumb')
    }));
  } 
  catch (e) {
    console.error(e.stack);
    console.trace();
  }
      
  return require('./fs/delivery').fixHTML(K.$('html').html(), {
    Kern: K,
    styles: K.assets.styles,
    scripts: _.extend(K.assets.scripts, {
      settings: {
        weight: -10,
        data: {}
      },
      startup: {
        weight: 10,
        content: 'var kern = new Kern(settings);var flashes = ' + JSON.stringify(req.flash()) + ';console.info("flashes",flashes);kern.flash(flashes);'
      }
    })
  });
  

};


/*
var path1 = '/home/papi/papo/bla';
var path2 = './../../tada';
var root = '/home/papi/pouet';
function rel(p) {
  p = p.substr(0, 2) == './' ? root + '/' + p.substr(2, p.length) : p;
  //p = p.split(root+'/').pop();
  while (p.split(/\/[^\/]*\/..\//).length > 1) {
    p = p.split(/\/[^\/]*\/..\//).join('/');
  }
  return p;
}


function diff(p1, p2) {
  var common = [];
  var pp1 = rel(p1).split('/');
  var pp2 = rel(p2).split('/');
  var longest = pp2.length > pp1.length ? pp2 : pp1;
  console.info('longest: ' + longest.join('/'), 'pp1: ' + pp1.join('/'), 'pp2: ' + pp2.join('/'));
  for (var i in longest) {
    var current = longest[0];
    console.info(i, 'current: ' + current);
    if (pp1[0] == pp2[0]) {
      pp1.shift();
      pp2.shift();
      common.push(current);
      console.info(i, 'pp1: ' + pp1.join('/'), 'pp2: ' + pp2.join('/'));
    }
  }
  console.info('common', common, 'pp1: ' + pp1.join('/'), 'pp2: ' + pp2.join('/'));
}



console.info(path1, path2);
diff(relPath1, relPath2);
*/





methods.adminCredential = function() {
  console.info(require.main.ADMINCREDENTIALS);
  return 'admin:secret';//require.main.ADMINCREDENTIALS;
};

methods.basicAuth = function(req, res, next) {
  if (req.headers.authorization && req.headers.authorization.search('Basic ') === 0) {
    // fetch login and password
    if (new Buffer(req.headers.authorization.split(' ')[1], 'base64').toString() == methods.adminCredential()) {
      next();
      return;
    }
  }
  // console.log('Unable to authenticate user');
  // console.log(req.headers.authorization);
  res.header('WWW-Authenticate', 'Basic realm="Admin Area"');
  if (req.headers.authorization) {
    setTimeout(function() {
      res.send('Authentication required', 401);
    }, 5000);
  }
  else {
    res.send('Authentication required', 401);
  }
};


methods.pathRequestCallback = function(req, res, next){
  var host = req.headers.host;
  if (K.settings.redirectDirIndex) {
    if (K.paths[req.url+'/index.html']) {
      return res.redirect(req.url+'/index.html');
    }
    else if (K.paths[req.url+'index.html']) {
      return res.redirect(req.url+'index.html');
    }
  }
  else if (K.settings.redirectIndexDir) {
    // @todo some regexp...
    if (req.url.split('/index.html').length == 2) {
      return res.redirect(req.url.split('/index.html').shift());
    }
  }
  K.sendContent(req, res, next);
};

methods.registerPaths = function() {
  K = K || this;
  for (var f in K.paths) {
    if (typeof f === 'string' && f != '/undefined' && f != 'undefined') {
      try {
        K.app.get(escape(f), methods.pathRequestCallback);
      }
      catch (e) {
        console.error('Could not register path for '+ f, e);
      }
    }
  }
};

/**
 * Starts the server
 */
methods.serve = function() {
  if (!require('./kern').Kern.isKern(this)) {
    throw new Error('Can not serve, not a valid Kern object');
  }
  
  K = this;
  
  var express = require('express')
    , S = K.settings
    , app = K.app
    , fs = require('fs')
  ;
  
  
  app.registerDefault = 'html';
  app.register('html', require('./fs/delivery'));
  app.set('views', S.publicDir);
  
  
  app.get('/', function(req, res, next){
    K.sendContent(req, res, next);
  });
  app.get('/cache.manifest', function(req, res, next){
    var manifest = K.manifest();
    K.log('logging', "Cache manifest requested\n"+manifest);
    return res.send(manifest, { 'Content-Type': 'text/cache-manifest' }, 200);
  });
  
  
  function filesReq(req, res) {
    function remove(obj) {
      if (typeof obj.content == 'string') {
        delete obj.content;
      }
      for (var c in obj.content) {
        obj.children[c] = remove(obj.children[c]);
      }
      delete obj.mime;
      delete obj.hash;
      delete obj.absPath;
      return obj;
    }
    
    var maxDepth = req.query.maxdepth || 2
      , from = req.query.from || '/'
      , S = K.paths[from]
    ;
    
    console.info('Starting from '+ from);
    res.send(remove(S.toJSON()));
  };
  app.get('/kern/files.js', filesReq);
  
  // serve the K.js and some others
  app.get('/kern.js', function(req, res, next) {
    return res.sendfile(__dirname + '/kern.js');
  });
  app.get('/kern.methods.js', function(req, res, next) {
    return res.sendfile(__dirname + '/common/methods.js');
  });
  app.get('/kern.bone.js', function(req, res, next) {
    return res.sendfile(__dirname + '/common/bone.js');
  });
  
  app.get('/kern.yep.().js', function(){
    return res.send('/* '+ req.params.join("\n") +' */', {'Content-Type': 'text/javascript'});
  });
  
  
  // should be a compressed version... @todo
  app.get('/kern.min.js', function(req, res, next) {
    var files = [
        __dirname + '/common/methods.js',
        __dirname + '/common/bone.js',
        __dirname + '/kern.js'
      ]
      , fs = require('fs')
      , content = ''
    ;
    
    K.log('info', 'Aggregating: ' + files.join("\n"));
    _.map(files, function(file, key){
      content = content + "\n// "+ file +"\n"+ fs.readFileSync(file).toString();
    });
    
//    content = require('./fs/js').compressJS(content);
    
    return res.send(content, { 'Content-Type': 'text/javascript' }, 200);
  });
  
  
  K.registerPaths();
  
  app.get('/*(css|js|png|ico|gif|jpg)', function(req, res, next) {
    var path = decodeURI(req.url.split('?').shift());
    console.info('static delivery for '+ path);
    res.sendfile(K.publicDir() + path, function(err, data) {
      if (err) {
        res.sendfile(K.contentDir() + path, function(err, data) {
          if (err) return next(err);
        });
      }
    });
  });
  
  
  K.app.listen(S.port, S.hostname);
  K.log('info', 'Server is serving on ' + S.hostname + (S.port != 80 ? ':' + S.port : ''));
  /*
  K.log('info', 'The following GET routes are registered: '+ _.pluck(app.routes.routes.get, 'path').join("\n"));
  */
  
  if (S.socketEnabled) {
    var sio = require('socket.io');
    K.io = sio.listen(app);
    
    K.io.configure('production', function(){
      io.enable('browser client etag');
      io.set('log level', 1);
      
      io.set('transports', [
        'websocket'
      //, 'flashsocket'
      //, 'htmlfile'
      //, 'xhr-polling'
      //, 'jsonp-polling'
      ]);
    });
    
    K.io.configure('development', function(){
      io.enable('browser client etag');
      io.set('log level', 1);
      io.set('transports', ['websocket']);
    });
    K.io.sockets.on('connection', function(socket) {
      socket.on('set nickname', function (name) {
        socket.set('nickname', name, function () {
          socket.emit('ready');
        });
      });
      
      socket.on('msg', function () {
        socket.get('nickname', function (err, name) {
          console.log('Chat message by ', name);
        });
      });
      
      socket.emit('sid', socket.id);
      K.connected[socket.id] = {
        id: socket.id
      };
      socket.broadcast.emit('newcomer', K.connected[socket.id]);
    });
    
    K.io.sockets.on('sid', function(socket){
      console.log('sid -------------------------', arguments);
      _.extend(K.connected[socked.id], arguments[1]);
      socket.emit('sid', socket.id);
      socket.broadcast.emit('newcomer', K.connected[socket.id]);
    });
    
    // you may want to have a look at <methods.compassWatch>
    try {
      fs.watchFile(K.publicDir() + '/css/style.css', function(curr, prev) {
        if (curr.mtime == prev.mtime) return;
        
        K.notify(null, {
          title: 'The following assets have changed'
        , text: '/css/style.css'
        }, {
          socketEvent: 'assetchange'
        , socketData: {
            styles: [
              {
                href: '/css/style.css'
              }
              /*
            , {
                href: 'css/style.css'
              }
              */
            ]
          }
        });
      });
    } 
    catch (e) {
      console.error(e);
    }
    
    K.log('info', 'Sockets are listenning too');
  }
};


/***********************************************************\
 * File system model
\***********************************************************/



// following methods are kind of subset of the "path" from nodejs
// should work the same but take no "p" arguments
methods.contentEntry.dirname = function() {
  return require('path').join(this.parents);
};
methods.contentEntry.basename = function(ext) {
  return require('path').basename(this.get('name'), ext);
};
methods.contentEntry.extname = function() {
  return require('path').extname(this.basename());
};
methods.contentEntry.exists = function(cb) {
  require('path').exists(this.absPath(), cb);
};
methods.contentEntry.existsSync = function() {
  return require('path').exists(this.absPath());
};

methods.contentEntry.absPath = function() {
  var absPath = this.get('absPath');
  if (!absPath) absPath = this.Kern.contentDir() +'/'+ this.get('url');
  return absPath;
};

methods.contentEntry.scan = function(absPath) {
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
    if (CE.get('depth') < 4) {
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
            console.info(absPath +'/'+ files[f] +'was found at position '+ exists);
          }
        }
      });
    }
  }
  else {
    console.info('Analysing '+ CE.absPath());
//    var info = _.clone(CE.attributes);
    var info = CE.attributes;
    
    // computing a hash might not be a so good idea
    //info.hash = crypto.createHash('sha1').update(info.content).digest('hex');
    info.mime = require('mime').lookup(absPath);
    //info.ext = info.name.split('.').pop();
    
    if (!_.isUndefined(exports.fs.parsers) && _.isFunction(exports.fs.parsers[info.mime])) {
      try {
        exports.fs.parsers[info.mime].call(CE, info);
      } 
      catch (e) {
        console.error('Could not parse '+ info.absPath);
        console.error(error);
      }
    }
  }
};


methods.contentEntry.watch = function(cb) {
//  if (K.settings.noWatches !== false) return;
  var CE = this;
  if (CE.watched) return;
  var mimeTest = K.settings.contentWatchExp.test(CE.get('mime'));
//  console.info('Should avoid watching '+ CE.get('mime') +'?', mimeTest, K.settings.contentWatchExp);
return;
  if (mimeTest) return;
  var absPath = CE.absPath() || K.contentDir() + CE.get('url');
  
  if (typeof cb != 'function') {
    cb = function(curr, prev){
      if (curr.mtime == prev.mtime) return;
      
      if (!K.settings.socketEnabled || _.isUndefined(K.io)) return;
      console.info('Propagating changes');

      CE.scan();
      
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
  console.info('Start watching '+ absPath);
  fs.watchFile(absPath, cb);
};


methods.contentEntry.unwatch = function() {
  if (!this.watched) return;
  this.watched = false;
  fs.unwatchFile(this.Kern.contentDir() + this.get('url'));
};


methods.contentEntry.initialize = function(attributes, options) {
  K = typeof K !== 'undefined' ? K : options.Kern;
  
  if (!require('./kern').isKern(K)) {
    console.trace('methods.contentEntry.initialize() called without Kern', path);
    return {};
  }
  this.Kern = K;
  
  
  var absPath
    , CE = this
    , exp      = /\.js|\.css|\.nd|~/ig
    , children = this.attributes.children || []
  ;
  
  
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
  
  
  CE.scan();
  
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
  
  
  
  
  if (_.isUndefined(CE.get('url')) || CE.get('url') == 'undefined') {
    CE.set({url: absPath.split(K.contentDir()).pop()}, {silent: true});
  }
  K.paths[CE.get('url')] = CE;
};


/***********************************************************\
 * Utilities
\***********************************************************/

var logger = _.extend({
  logging: function(){
    console.info.apply(this, arguments);
    if (this.io) {
      this.io.sockets.emit('logging', {
        started: this.started(),
        data: _.toArray(arguments)
      });
    }
  }
}, console);

/**
 * Function: methods.log
 * Server loging
 * 
 */
methods.log = function() {
  var method = function(){};
  var args = _.toArray(_.clone(arguments));
  var methodName = typeof logger[args[0]] == 'function' ? args.pop() : 'log';
  if (typeof logger[methodName] == 'function') {
    method = logger[methodName];
  }
  if (this.app) {
//    console.log("\n\nHurraayy! \n'"+ methodName+"': ", method);
  }
  // "this" should be a Kern object...
  method.apply(this, arguments);
  // would be nice to forward the logging to the socket for mobile devices debuging
};
