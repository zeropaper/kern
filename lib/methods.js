var _ = require('underscore')._
  , fs = require('fs')
  , methods = exports
  , xml2js = require('xml2js')
  , http = require('http')
  , url = require('url')
  , child_process = require('child_process')
  , Inotify = require('inotify-plusplus')
;

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

_.extend(methods.contentEntry, require('./contentEntry.js'));


methods.publicDir = function() {
  return this.settings.publicDir;
};



methods.cacheDir = function() {
  return this.settings.cacheDir;
};


methods.lookup = function (req, res) {
  
  var ps = req.params
    , K = this
  ;
  
  
  if (ps.length < 1) return false;
  
  var s = '/'+ ps[0];
  var l = s +'.'+ ps[1];
  
  if (typeof K.paths[s] == 'object') {
    console.info('Found, s '+ s);
    return K.paths[s];
  }
  
  if (ps.length > 1 && typeof K.paths[l] == 'object') {
    console.info('Found, l '+ l);
    return K.paths[l];
  }
  
  for (var p in K.paths) {
    if (p.split(s) == 2) {
      return K.paths[p];
    }
  }
  
  if (ps.length > 1) {
    for (var p in K.paths) {
      if (p.split(l) == 2) {
        return K.paths[p];
      }
    }
  }
  
  return false;
};

methods.initialize = function() {
  // console.info('Kern is initializing on the server side');
  if (!require('./kern').Kern.isKern(this)) {
    throw new Error({
      message: 'Not a valid Kern object'
    });
  }
  
  var express = require('express')
    , K = this
    , S = K.settings
    , app = express.createServer()
  ;
  
  K.bind('initialized', function() {
    console.info("================ KERN INITIALIZED ================");
  });

  K.$ = $ || K.$ || require('jQuery');
  
  K.inotify = Inotify.create(true);

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
    /*
    app.use(express.errorHandler({
      dumpExceptions: true,
      showStack: true
    }));
    */
  });
  
  app.configure('production', function() {
    //app.use(express.errorHandler());
  });
  
  app.registerDefault = 'html';
  app.register('html', require('./fs/delivery'));
  app.set('views', S.publicDir);

  














  K.app = app;
  //K.sio = require('socket.io');
  
  K.assets = K.assets || (K.assets = {});
  
  
  function staticDelivery(asset, req, res, next) {
    res.sendfile(K.publicDir() + req.url.split('?').shift(), function(err){
      if (err) return next(err);
    });
  }
  
  _.extend(K.assets.styles || (K.assets.styles = {}), {
    '/js/lib/*(css)': {
      noOutput: true,
      callback: staticDelivery
    },
    '/css/*': {
      noOutput: true,
      callback: staticDelivery
    },
    '/fonts/*': {
      noOutput: true,
      callback: staticDelivery
    },
    '/images/*': {
      noOutput: true,
      callback: staticDelivery
    },
    '/js/lib/jquery-ui/themes/base/jquery.ui.theme.css': {
      weight: -50,
    },
    '/js/lib/jquery-ui/themes/base/jquery.ui.base.css': {
      weight: -50
    },
    '/css/style.css': {
      filepath: K.publicDir() + '/css/style.css',
      weight: 50
    }
  });
  
  _.extend(K.assets.scripts || (K.assets.scripts = {}), {
    '/js/lib/*(js)': {
      noOutput: true,
      callback: function(asset, req, res, next) {
        res.sendfile(K.publicDir() + req.url, function(err){
          if (err) return next(err);
        });
      },
    },
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
      filepath: K.publicDir() + '/js/script.js',
      weight: 50
    }
  });
  
  
  K.assets.templates = K.assets.templates || (K.assets.templates = {});
  var path = __dirname +'/common/templates.html';
  K.loadTemplates(path);
    
  if (K.settings.socketEnabled) {
    K.assets.scripts['/socket.io/socket.io.js'] = {
      external: true,
      weight: -50
    };
    K.connected = {};
  }
  
  
  _.extend(K.assets.scripts, {
    '/kern.methods.js': {
      filepath: __dirname + '/common/methods.js',
      weight: -5
    },
    '/kern.bone.js': {
      filepath: __dirname + '/common/bone.js',
      weight: -4
    },
    '/kern.js': {
      filepath: __dirname + '/kern.js',
      weight: 0
    },
//    '/kern.min.js': {},
  });
  
  /*
  */
  K.app.error(function(err, req, res, next) {
    //return res.send(err.name, err.code);
    return K.loadLayout(function() {
      
      console.info('Loaded layout', K.$('body').length > 0);
      console.error('Error page error', err);
      
      K.apply(K.errorEntry(err));
      
      _.extend(K.assets.scripts, {
        settings: {
          weight: -10,
          data: K.settings
        },
        startup: {
          weight: 10,
          content: 'var kern = new Kern(settings);'
        }
      });
      
      K.$('head').append(renderStylesAssets.call(K));
      K.$('body').append('<div class="kern-scripts">' + "<!-- kern scripts\n" + renderScriptsAssets.call(K) + "\nkern scripts -->" + '</div>');
      K.$('body').append('<div class="kern-templates">' + renderTemplatesAssets.call(K) + '</div>');
      
      return res.send(require('./fs/delivery').fixHTML(K.$('html').html(), {
        Kern: K
      }), err.code || 404);
    });

  });

  K.app.get('/404', function(req, res, next) {
    throw new K.errors.NotFound('The page 404 could not be found.');
  });
  K.app.get('/500', function(req, res, next) {
    throw new K.errors.InternalServerError('Something is really wrong on the server.');
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
  if (typeof opt.callback == 'function') opt.callback.call(K, vars, opt);
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
      exec("compass compile "+ K.publicDir(), function(error, stdout, stderr) {
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
  
  
  console.info("\n\n\n***********************************************************\n\n\n");
  console.info(req.url, req.query);
  if (!_.isUndefined(req.query._escaped_fragment_)) {
    url = req.query._escaped_fragment_;
  }
  
  
  
  /*
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
  */
  console.info('----- Url: ' + url + ', extension: ' + ext + ', static: ', staticDelivery);
  
  if (staticDelivery) {
    if (S.staticUseCDN) {
      var cdnURL = 'http://'+ S.staticHostname + (S.staticPort != 80 ? S.staticPort : '') + S.staticPath
      console.info('----- Redirecting to cdnURL '+cdnURL);
      return res.redirect(cdnURL, 301);
    }
    
    if (K.paths[url] instanceof K.models.ContentEntry) {
      console.info("----- Delivering a content entry");
    }
    
    K.log('info', ' ----- Delivering staticaly');
    return res.sendfile(K.contentDir() + url.split('?').shift(), function(err, data) {
      if (err) return next(err);
    });
  }
  
  res.send(K.applyFile(req.url, req, next));
};

methods.loadLayout = function(cb, path) {
  K = K || this;
  var $ = K.$;
  var path = path || K.publicDir() +'/layout.html';
  var layout = fs.readFileSync(path).toString()
    , $layout = $(layout)
  ;
  
  $('body').replaceWith($layout.children('body'));
  $('head').replaceWith($layout.children('head'));
  if (typeof cb == 'function') cb.call(K);
}

methods.loadTemplates = function(path) {
  var K = this;
  var $ = K.$;
  var templates = fs.readFileSync(path).toString()
    , $templates = $(templates)
    , $tmpls = $('script[type="text/template"].kern-template', $templates)
    , $scripts = $('script[type="text/javascript"].kern-script', $templates)
    , $styles = $('style.kern-style', $templates)
  ;
  console.info('Load templates for '+ path, $tmpls.length);
  function apply() {
    if (!$(this).attr('id')) return;
    var $el = $(this);
    var type = $el.hasClass('kern-style') ? 'styles' : ($el.hasClass('kern-script') ? 'script' : 'templates');
    K.assets[type][$el.attr('id')] = type == 'templates' ? $(this).html() : {
      weight: ($el.attr('data-weight') || 0),
      content: $(this).html()
    };
  }
  $tmpls.each(apply);
  $scripts.each(apply);
  $styles.each(apply);
}
  


function assetsSorting(a, b){
  a.weight = ((!a.weight) ? 0 : Number(a.weight));
  b.weight = ((!b.weight) ? 0 : Number(b.weight));
  return a.weight - b.weight;
}

function renderStylesAssets() {
  var K = this;
  var parts = [];
  var css = [];
  
  function addStyleFile(url) {
    return '<link rel="stylesheet" href="' + url + '" />';
  }
  
  function addStyleData(data) {
    var parts = ['<style type="text/css">', '//<![CDATA[', data, '//]]>', '</style>'];
    return parts.join("\n");
  }
  
  _.each(K.assets.styles, function(info, path) {
    css.push(_.extend({path: path, weight: 0}, info));
  });
  _.each(css.sort(assetsSorting), function(info) {
    
    if ((!info.section || info.section != '# rev ') && !info.noOutput) {
      if (_.isString(info.content)) {
        //console.info('Injecting inline style for ' + info.path);
        parts.push(addStyleData(info.content));
      }
      else {
        //console.info('Injecting style for ' + info.path);
        parts.push(addStyleFile(info.path));
      }
    }
  });
  
  return parts.join("\n\n");
}


function renderScriptsAssets() {
  var K = this;
  var inlineScripts = [];
  var fileScripts = [];
  var parts = [];
  
  // @todo some aggregation
  
  function addScriptFile(url) {
    return '<script type="text/javascript" src="' + url + '"></script>';
  }
  function addScriptData(data) {
    var parts = ['<script type="text/javascript">', '//<![CDATA[', data, '//]]>', '</script>'];
    return parts.join("\n");
  }
  function addScriptFileCDN(url, test, fallback) {
    var parts = ['', '<!-- CDN -->', addScriptFile(url), addScriptData(test + ' || document.write(\'<script type="text/javascript" src="' + fallback + '"><\\/script>\');'), ''];
    return parts.join("\n");
  }
  
  
  //console.info('Adding scripts to the output', options.scripts);
  var js = [];
  _.each(K.assets.scripts, function(info, path) {
    js.push(_.extend({path: path, weight: 0}, info));
  });
  _.each(js.sort(assetsSorting), function(info) {
    if ((!info.section || info.section != '# rev ') && !info.noOutput) {
      if (typeof info.cdn == 'object') {
        //console.info('Injecting script with CDN for ' + info.path);
        parts.push(addScriptFileCDN(info.cdn.url, info.cdn.test, info.path));
      }
      else if (typeof info.data != 'undefined') {
        //console.info('Injecting data for ' + info.path, info.data);
        parts.push(addScriptData('var ' + info.path + ' = _.extend(' + info.path + ' || {}, ' + JSON.stringify(info.data) + ');'));
      }
      else if (typeof info.content != 'undefined') {
        //console.info('Injecting inline script for ' + info.path);
        parts.push(addScriptData(info.content));
      }
      else {
        //console.info('Injecting script for ' + info.path);
        parts.push(addScriptFile(info.path));
      }
    }
  });
  return parts.join("\n\n");
}

function renderTemplatesAssets() {
  var K = this;
  var parts = [];
  _.each(K.assets.templates, function(html, id) {
    parts.push('<script type="text/template" id="'+id+'">'+html+"</script>");
  });
  return parts.join("\n\n");
}

/**
 * Function methods.applyFile
 * Apply the information about a file into the page
 */
methods.applyFile = function(fileURL, req, next) {
  fileURL = unescape(fileURL);
  K = K || this;
  var $ = K.$;
  
  file = _.isString(fileURL) ? K.paths[fileURL] : false;
  if (!file || !_.isFunction(file.get)) throw new K.errors.NotFound('Could not load "'+ fileURL +'"');
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
    
  K.loadLayout(function() { console.info('Loaded layout', K.$('body').length > 0); });
  K.apply(file);
    
  _.extend(K.assets.scripts, {
    settings: {
      weight: -10,
      data: K.settings
    },
    startup: {
      weight: 10,
      content: 'var kern = new Kern(settings);'+
        'var flashes = ' + JSON.stringify(req.flash()) + ';'+
 //       'console.info("flashes",flashes);'+
        'kern.flash(flashes);'
    }
  });
  
  K.$('head').append(renderStylesAssets.call(K));
  K.$('body').append('<div class="kern-scripts">'+"<!-- kern scripts\n"+ renderScriptsAssets.call(K) +"\nkern scripts -->"+'</div>');
  K.$('body').append('<div class="kern-templates">'+renderTemplatesAssets.call(K)+'</div>');
  
  return require('./fs/delivery').fixHTML(K.$('html').html(), {
    Kern: K
  });
  

};







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
      K.app.get(escape(f), methods.pathRequestCallback);
      K.app.get(f, methods.pathRequestCallback);
    }
  }
};

methods.sendAsset = function(asset, req, res, next){
  K = K || this;
  if (!asset.filepath) return next(new Error('No filepath for asset'));
  
  res.sendfile(asset.filepath, function(err) {
    if (err) {
      next(err);
    }
    else {
      console.log('transferred %s', asset.filepath);
    }
  });
};

methods.registerAssets = function() {
  K = K || this;
  console.info('------- Registering assets --------');
  for (var t in _.clone(K.assets)) {
    var type = K.assets[t];
    console.info(" - Registering "+ t +" assets");
    for (var a in type) {
      (function(info){
        var asset = _.extend({type: t, path: typeof info.path == 'string' ? info.path : a}, info);
        
        if (!_.isFunction(asset.callback) && !_.isString(asset.filepath)) return;
        var cb = typeof asset.callback == 'function' ? asset.callback : methods.sendAsset;
        
        console.info(" - - Registered "+ asset.path);
        K.app.get(asset.path, function(req, res, next) {
          //console.info('Asset requested '+ req.url, asset);
          cb.call(K, asset, req, res, next);
        });
      })(type[a]);
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
  
  
  function filesReq(req, res, next) {
    function remove(obj) {
      if (typeof obj.content == 'string') {
        delete obj.content;
      }
      for (var c in obj.content) {
        obj.children[c] = remove(obj.children[c]);
      }
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
  
  /*
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
  */
  
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
  K.registerAssets();
  
  K.app.get('*', function(req, res, next){
    throw new K.errors.NotFound(req.url +' could not be found');
  });
  
  K.app.listen(S.port, S.hostname);
  K.log('info', 'Server is serving on ' + S.hostname + (S.port != 80 ? ':' + S.port : ''));

  console.info('The following GET routes are registered: '+ _.pluck(app.routes.routes.get, 'path').join("\n"));
    
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
    
    function changed(curr, prev) {
      if (curr.mtime == prev.mtime) return;
      fs.unwatchFile(K.publicDir() + '/css/style.css');
      K.notify(null, {
        title: 'The following assets have changed'
      , text: '/css/style.css'
      }, {
        callback: function(){
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
    
    // you may want to have a look at <methods.compassWatch>
    try {
      fs.watchFile(K.publicDir() + '/css/style.css', changed);
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

/***********************************************************\
 * Player
\***********************************************************/


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
