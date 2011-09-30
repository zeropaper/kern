var _ = require('underscore')._
  , methods = exports;

_.extend(methods, require('./common/methods'));

methods.fs = require('./fs/fs');


var commonFS = require('./common/methods').fs;
/*
console.info("\n\n\n");
console.info('commonFS', commonFS);
console.info('commonFS', commonFS.getFiles.toString());
console.info("\n\n\n");

console.info("\n\n\n");
console.info('serverFS', methods.fs);
console.info('serverFS', methods.fs.getFiles.toString());
console.info("\n\n\n");
*/
methods.fs = _.extend(commonFS, methods.fs);
/*
console.info("\n\n\n");
console.info('merged', methods.fs);
console.info('serverFS', methods.fs.getFiles.toString());
console.info("\n\n\n");
*/
methods.onServer = true;

methods.contentDir = function() {
  return this.settings.contentDir;
};

methods.publicDir = function() {
  return this.settings.publicDir;
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
    , sio = require('socket.io')
    , fs = require('fs')
    , K = this
    , S = K.settings
  ;
  
  
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.cookieParser());
  app.use(app.router);
  
  
  // session handling if settings are defined
  if (typeof S.session == 'object') {
    var MemoryStore = express.session.MemoryStore;
    app.use(express.session(_.extend({
      store: new MemoryStore()
    }, S.session)));
  }
  
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
  K.sio = sio;
  

  K.files = K.fs.getFiles.call(K, function(){
    try {
      K.routes = K.fs.flatten(K.files);
    }
    catch (e) {
      console.trace(e);
    }
  });
  K.log('Kern is initialized');
};













methods.sendContent = function(req, res, next) {
  if (!require('./kern').isKern(this)) {
    console.error(this);
    return next(new Error('Not a valid Kern object'));
  }
  
  var url = req.url
    , K = this
    , ext = url.split('/').pop().split('.').pop().split('?').shift()
    , exp = /(js|css|jpg|png|gif)/ig
    , staticDelivery = exp.test(ext)
  ;
  
  // console.info('Url: ' + url + ', extension: ' + ext + ', static: ', staticDelivery);
  
  if (staticDelivery) {
    K.log(' ----- Delivering staticaly');
    return res.sendfile(kern.contentDir() + url.split('?').shift(), function(err, data) {
      if (err) return next(err);
    });
  }
  else if (url.substr(url.length - 1, url.length) == '/') {
    K.log(' ----- A directory has been requested');
    if (typeof K.routes[req.url + 'index.html'] == 'object') {
      K.log(' ----- Using ' + req.url + 'index.html');
      url = req.url + 'index.html';
    }
  }
  
  res.render(K.publicDir() + '/layout.html', {
    Kern: K,
    req: req,
    res: res,
    files: K.files,
    currentFile: K.routes[url] || {parents:[],depth:0,regions:{main:''},children:{}},
    currentUrl: url
  });
};













/**
 * Starts the server
 */
methods.serve = function() {
  if (!require('./kern').Kern.isKern(this)) {
    throw new Error('Can not serve, not a valid Kern object');
  }
  
  var express = require('express')
    , K = this
    , S = K.settings
    , app = K.app
    , sio = K.sio
    , fs = require('fs')
  ;
  
  app.registerDefault = 'html';
  app.register('html', require('./fs/delivery'));
  app.set('views', S.publicDir);
  
  var files = K.fs.getFiles.call(K);
  
  for (var f in K.routes) {
    if (typeof f === 'string' && f != '/undefined') {
      //K.log('Registering: ', f);
      app.get(f, function(req, res, next){
        if (K.settings.redirectDirIndex) {
          if (K.routes[req.url+'/index.html']) {
            res.redirect(req.url+'/index.html');
          }
          else if (K.routes[req.url+'index.html']) {
            res.redirect(req.url+'index.html');
          }
        }
        else if (K.settings.redirectIndexDir) {
          // @todo some regexp...
          if (req.url.split('/index.html').length == 2) {
            res.redirect(req.url.split('/index.html').shift());
          }
        }
        K.sendContent(req, res, next);
      });
      try {
        (function(path) {
          fs.watchFile(K.contentDir() + path, function(curr, prev){
            console.info('file '+ path +' has changed to', curr, this._events);
            try {
              K.io.sockets.emit('filechange', {path: path});
            }
            catch(e) {
              console.error(e);
            }
          });
        })(f);
      }
      catch (e) {
        console.error(e);
      }
    }
  }
  app.get('/', function(req, res, next){
    K.sendContent(req, res, next);
  });
  
  
  
  
  function basicAuth(req, res, next) {
    if (req.headers.authorization && req.headers.authorization.search('Basic ') === 0) {
      // fetch login and password
      if (new Buffer(req.headers.authorization.split(' ')[1], 'base64').toString() == 'admin:secret') {
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
  }
  
  app.get('/kern/editor', basicAuth, function(req, res) {
    // console.info("\nContent page requested", req.query);
    var editor = require('./editor');
    editor.render.call(K ,req, res);
  });
  app.post('/kern/editor', basicAuth, function(req, res) {
    console.info("\nContent page requested", req.query);
    var editor = require('./editor');
    editor.save.call(K ,req, res);
  });
  
  function filesReq(req, res) {
    var clean = _.clone(K.files);
    function remove(obj) {
      if (typeof obj.content == 'string') {
        delete obj.content;
      }
      else {
        for (var c in obj.content) {
          obj.children[c] = remove(obj.children[c]);
        }
      }
      delete obj.mime;
      delete obj.hash;
      return obj;
    }
    res.send(remove(clean));
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
  
  
  
  
  // should be a compressed version... @todo
  app.get('/kern.min.js', function(req, res, next) {
    var files = [
        /*
        K.publicDir() + '/js/lib/modernizr.min.js',
        K.publicDir() + '/js/lib/respond.min.js',
        K.publicDir() + '/js/lib/underscore.js',
        K.publicDir() + '/js/lib/backbone.js',
        K.publicDir() + '/js/lib/backbone-localstorage.js',
        K.publicDir() + '/js/lib/jquery.min.js',
        */
        __dirname + '/common/methods.js',
        __dirname + '/common/bone.js',
        __dirname + '/kern.js'
      ]
      , fs = require('fs')
      , content = ''
    ;
    
    K.log('Aggregating: ' + files.join("\n"));
    _.map(files, function(file, key){
      content = content + "\n// "+ file +"\n"+ fs.readFileSync(file).toString();
    });
    
//    content = require('./fs/js').compressJS(content);
    
    return res.send(content, { 'Content-Type': 'text/javascript' }, 200);
  });
  
  // administration environment
  app.get('/kern', function(req, res, next) {
    return res.send('You are in the Kern.');
  });
  
  app.get('/*(css|js|png|ico|gif|jpg)', function(req, res, next) {
    res.sendfile(K.publicDir() + req.url.split('?').shift(), function(err, data) {
      if (err) 
        return next(err);
    });
  });
  
  
  
  K.app.listen(S.port, S.hostname);
  K.log('Server is serving on ' + S.hostname + (S.port != 80 ? ':' + S.port : ''));
  
  K.io = K.sio.listen(app);
  K.log('Sockets are listenning too');
  
  try {
    var css = K.publicDir() +'/css/style.css';
    fs.watchFile(css, function(curr, prev){
      K.io.sockets.emit('assetchange', {
        styles: [{href:'css/style.css'}]
      });
    });
  }
  catch (e) {
    console.error(e);
  }
  
  K.io.sockets.on('connection', function(socket) {
    socket.emit('news', {
      hello: 'world'
    });
    socket.on('my other event', function(data) {
      console.log(data);
    });
  });
  K.log('The following GET routes are registered: '+ _.pluck(app.routes.routes.get, 'path').join("\n"));
};

