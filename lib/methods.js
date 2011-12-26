var _ = require('underscore')._
  , fs = require('fs')
  , methods = exports
  , xml2js = require('xml2js')
  , http = require('http')
  , url = require('url')
  , child_process = require('child_process')
  , Inotify = false
;

try {
  Inotify = require('inotify-plusplus');
}
catch (e) {
  console.error(e);
}

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


//methods.lookup = function (req, res) {
methods.lookup = function (params) {
  if (params.length < 1) return false;
  
  var K = this;
  var s = '/'+ params[0];
  var l = s +'.'+ params[1];
  
  if (typeof K.paths[s] == 'object') {
    console.info('Found, s '+ s);
    return K.paths[s];
  }
  
  if (params.length > 1 && typeof K.paths[l] == 'object') {
    console.info('Found, l '+ l);
    return K.paths[l];
  }
  
  for (var p in K.paths) {
    if (p.split(s) == 2) {
      return K.paths[p];
    }
  }
  
  if (params.length > 1) {
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
  
  K.inotify = Inotify ? Inotify.create(true) : false;

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
    '/favicon.ico': {
      filepath: K.publicDir() + '/favicon.ico',
      noOutput: true
    },
    '/js/lib/jquery-ui/themes/base/jquery.ui.theme.css': {
      weight: -50
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
    '/js/lib/*': {
      noOutput: true,
      callback: staticDelivery
      // callback: function(asset, req, res, next) {
      //   res.sendfile(K.publicDir() + req.url, function(err){
      //     if (err) return next(err);
      //   });
      // },
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
    }
//    '/kern.min.js': {},
  });
  
  /*
  */
  K.app.error(function(err, req, res, next) {
    //return res.send(err.name, err.code);
    return K.loadLayout(function() {
      
      console.info('Loaded layout', K.$('body').length > 0);
      console.error('Error page error', err, err.stack);
      
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
      
      var returnedHTML = require('./fs/delivery').fixHTML(K.$('html').html(), {
        Kern: K
      });
      return res.send(returnedHTML, _.isNumber(err.code) ? err.code : 404);
    });

  });

  // K.app.get('/404', function(req, res, next) {
  //   throw new K.errors.NotFound('The page 404 could not be found.');
  // });
  // K.app.get('/500', function(req, res, next) {
  //   throw new K.errors.InternalServerError('Something is really wrong on the server.');
  // });
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

_.extend(methods, require(__dirname + '/compass/compass.js'));
// methods.compassWatch = function() {
//   var sys = require('sys')
//     , K = this
//     , exec = require('child_process').exec
//     , _s = require('underscore.string')
//     , lastChange
//   ;
//   if (K._compassWatched) {
//     console.info('The compass project in '+ K.publicDir() +' is already watched');
//     return false;
//   }
//   K._compassWatched = true;
  
//   function recurseWatch(path) {
//     if (fs.statSync(path).isDirectory()) {
//       fs.readdir(path, function(err, files){
//         if (err) return;
//         for (var f in files) {
//           if (files[f].substr(0, 1) == '.') continue;
//           recurseWatch(path +'/'+ files[f], changed);
//         }
//       });
//     }
//     else {
//       fs.watchFile(path, function(curr, prev){
//         changed(path, curr, prev);
//       });
//       console.info('Watching compass file '+ path);
//     }
//   }
  
//   function changed(path, curr, prev) {
//     if (curr.mtime == prev.mtime || lastChange == curr.mtime) return;
//     console.info(path +' has changed');
//     //fs.unwatchFile(path);
//     // preventing double compiling
//     // when adding/removing file from a watched directory
//     lastChange = curr.mtime;
    
    
//     // @todo need something when adding/removing files
//     // recurseWatch(new file path);
    
//     try {
//       exec("compass compile "+ K.publicDir(), function(error, stdout, stderr) {
//         if (error) {
//           console.error(error);
//           return;
//         }
//         console.info('Compass project recompiled');
//       });
//     }
//     catch(e) {
//       console.info('A sass file has changed but an error occured while compiling');
//       console.error(e);
//     }
//     /*
//     fs.watchFile(path, function(curr, prev){
//       changed(path, curr, prev);
//     });
//     */
//   }
  
//   fs.readFile(K.publicDir() +'/config.rb', function (err, data) {
//     if (err) {
//       console.error('Could not read '+ K.publicDir() +'/config.rb');
//       return;
//     }
//     data = data.toString();
//     //console.info("Content of config.rb\n", data);
//     var lines = data.split("\n");
//     var info = {};
//     for (var l in lines) {
//       var line = _s.trim(lines[l]);
//       if (!line.length || lines[l].substr(0, 1) == '#' || line.indexOf('=') == -1) continue;
//       var val = _s.trim(line.split('=').pop());
//       info[_s.trim(line.split('=').shift())] = val.substr(1, val.length - 2);
//     }
//     console.info("The config.rb contains\n", info);
    
//     if (info.sass_dir) {
//       recurseWatch(K.publicDir() +'/'+ info.sass_dir, changed);
//     }
//   });
// };


_.extend(methods, require(__dirname + '/compass/compass.js'));
// methods.manifest = function(){
//   var K = this;
//   var cache = {
//     '# rev ': [],
//     'CACHE:': [],
//     'FALLBACK:': [],
//     'NETWORK:': []
//   };
//   _.each(K.assets, function(assets, type){
//     _.each(assets, function(info, url){
//       var section = info.section || '# rev ';
//       cache[section] = cache[section] || [];
      
//       if (url.substr(0, 1) == '/') {
//         cache[section].push(url);
//       }
      
//     });
//   });
  
//   var lines = ['CACHE MANIFEST'];
//   for (var section in cache) {
//     lines.push('# '+ section +', '+ cache[section].length);
//     if (cache[section].length) {
//       lines.push(section +(section == '# rev ' ? K.started() : ''));
//       lines = _.union(lines, cache[section]);
//     }
//   }
//   return lines.join("\n");
// };







methods.sendContent = function(req, res, next) {
  if (!require('./kern').isKern(this)) {
    console.error(this);
    return next(new Error('Not a valid Kern object'));
  }
  console.info('req.params', req.params);
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


  console.info('----- Url: ' + url + ', extension: ' + ext + ', static: ', staticDelivery);
  
  if (staticDelivery) {
    if (S.staticUseCDN) {
      var cdnURL = 'http://'+ S.staticHostname + (S.staticPort != 80 ? S.staticPort : '') + S.staticPath
      console.info('----- Redirecting to cdnURL '+cdnURL);
      return res.redirect(cdnURL, 301);
    }
    


    if (K.paths[url] instanceof K.models.ContentEntry) {
//      throw new K.errors.InternalError("The URL "+ url +" should not be send statically");
      console.info("----- Delivering a content entry");
      return res.send(K.applyFile(url, req, res, next), 200);
    }
    



    K.log('info', ' ----- Delivering staticaly');
    return res.sendfile(K.contentDir() + url.split('?').shift(), function(err, data) {
      if (err) return next(err);
    });
  }
  
  
  
  // console.info('Kern.lookup(req.params)', K.lookup(req.params));
  
  
  
  res.send(K.applyFile(req.url, req, res, next));
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
  console.info('Load templates for '+ path, $tmpls.length, templates.length);
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
  
  
  file = fileURL == '/' || fileURL == '/' ? K.struct : (_.isString(fileURL) ? K.paths[fileURL] : false);
  if (!file || !_.isFunction(file.get)) throw new K.errors.NotFound('Could not load "'+ fileURL +'"');
  file = K.findIndex(file);
  
  var options = {
    file: file,
    root: file.id,
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
  



  var flashes = {};
  if (_.isFunction(req.flash)) req.flash();

  _.extend(K.assets.scripts, {
    settings: {
      weight: -10,
      data: K.settings
    },
    startup: {
      weight: 10,
      content: 'var kern = new Kern(settings);'+
        'var flashes = ' + JSON.stringify(flashes) + ';'+
 //       'console.info("flashes",flashes);'+
        'kern.flash(flashes);'
    }
  });
  
  K.$('head').append(renderStylesAssets.call(K));
  K.$('body').append('<div class="kern-templates">'+renderTemplatesAssets.call(K)+'</div>');
  K.$('body').append('<div class="kern-scripts">'+"<!-- kern scripts\n"+ renderScriptsAssets.call(K) +"\nkern scripts -->"+'</div>');
  
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
  console.inf('pathRequestCallback', arguments);
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
  
  K.app.get('/kern.templates.js', function(req, res, next) {
    console.info('Templates ', req.query);
    if (_.isString(req.query.name)) return res.send(K.getTemplate(req.query.name));
    return res.send(K.assets.templates);
  });
  
  for (var t in _.clone(K.assets)) {
    if (t == 'templates') continue;
    var type = K.assets[t];
    console.info(" - Registering "+ t +" assets");
    for (var a in type) {
      (function(info){
        var asset = _.extend({
          type: t,
          path: typeof info.path == 'string' ? info.path : a
        }, info);
        
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
  






  app.get('/kern/files.js', function(req, res, next) {
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
      , S = from == '/' ? K.struct : K.paths[from]
    ;
    
    
    
    
    if (!S) return res.send(500);
    res.send(remove(S.toJSON()));
  });
  
  
  app.get(/^\/kern\/(.*)\.json$/i, function(req, res, next){
    return res.json(req.params);
  });
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
  
  
  K.bind('registerpath', function(Model){
    if (Model.id) {
      K.paths[Model.id] = Model;
    }
  });
  
  K.bind('registerasset', function(Model){
    if (Model.has('url')) {
      K.paths[Model.get('url')] = Model;
    }
  });
  K.registerAssets();
  
  
  
  K.app.param('contentEntryPath', function(req, res, next, id){
    console.info('filepath params', req.params, id);
    
  });
  K.app.get(':contentEntryPath', function(req, res, next){
    console.info(':contentEntryPath', req.params);
    next();
    //K.sendContent(req, res, next);
    //throw new K.errors.NotFound(req.url +' could not be found');
  });
  
  
  K.app.get('*', function(req, res, next){
    console.info(">>>>>>>>>>>>>>>>>>>>>>>>>> \n "+ req.url);
    return K.sendContent(req, res, next);
    debugger;
    throw new K.errors.NotFound(req.url +' could not be found');
  });
  
  K.app.listen(S.port, S.hostname);
  K.log('info', 'Server is serving on ' + S.hostname + (S.port != 80 ? ':' + S.port : ''));
  K.trigger('listenning', app);
  

  // if (S.socketEnabled) {
  //   var sio = require('socket.io');
  //   K.io = sio.listen(app);
    
  //   K.io.configure('production', function(){
  //     io.enable('browser client etag');
  //     // io.set('log level', 1);
      
  //     io.set('transports', [
  //       'websocket'
  //     //, 'flashsocket'
  //     //, 'htmlfile'
  //     //, 'xhr-polling'
  //     //, 'jsonp-polling'
  //     ]);
  //   });
    
  //   // K.io.configure('development', function(){
  //   //   io.enable('browser client etag');
  //   //   io.set('log level', 1);
  //   //   io.set('transports', ['websocket']);
  //   // });



  //   K.io.sockets.on('connection', function(socket) {

  //     socket.on('set nickname', function (name) {
  //       socket.set('nickname', name, function () {
  //         socket.emit('ready');
  //       });
  //     });
      
  //     socket.on('msg', function () {
  //       socket.get('nickname', function (err, name) {
  //         console.log('Chat message by ', name);
  //       });
  //     });
      
  //     socket.emit('sid', socket.id);
  //     K.connected[socket.id] = {
  //       id: socket.id
  //     };
  //     socket.broadcast.emit('newcomer', K.connected[socket.id]);
  //   });
    
  //   K.io.sockets.on('sid', function(socket){
  //     console.log('sid -------------------------', arguments);
  //     _.extend(K.connected[socked.id], arguments[1]);
  //     socket.emit('sid', socket.id);
  //     socket.broadcast.emit('newcomer', K.connected[socket.id]);
  //   });
    
  //   function changed(curr, prev) {
  //     if (curr.mtime == prev.mtime) return;
  //     fs.unwatchFile(K.publicDir() + '/css/style.css');
  //     K.notify(null, {
  //       title: 'The following assets have changed'
  //     , text: '/css/style.css'
  //     }, {
  //       callback: function(){
  //         fs.watchFile(K.publicDir() + '/css/style.css', changed);
  //       }
  //     , socketEvent: 'assetchange'
  //     , socketData: {
  //         styles: [
  //           {
  //             href: '/css/style.css'
  //           }
  //         ]
  //       }
  //     });
  //   };
    
  //   // you may want to have a look at <methods.compassWatch>
  //   try {
  //     //fs.watchFile(K.publicDir() + '/css/style.css', changed);
  //   } 
  //   catch (e) {
  //     console.error(e);
  //   }
    
  //   K.log('info', 'Sockets are listenning too');
  // }
};


/***********************************************************\
 * File system model
\***********************************************************/



/*
 * https://raw.github.com/kvz/phpjs/master/functions/strings/get_html_translation_table.js
 */
function get_html_translation_table (table, quote_style) {
    // http://kevin.vanzonneveld.net
    // +   original by: Philip Peterson
    // +    revised by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
    // +   bugfixed by: noname
    // +   bugfixed by: Alex
    // +   bugfixed by: Marco
    // +   bugfixed by: madipta
    // +   improved by: KELAN
    // +   improved by: Brett Zamir (http://brett-zamir.me)
    // +   bugfixed by: Brett Zamir (http://brett-zamir.me)
    // +      input by: Frank Forte
    // +   bugfixed by: T.Wild
    // +      input by: Ratheous
    // %          note: It has been decided that we're not going to add global
    // %          note: dependencies to php.js, meaning the constants are not
    // %          note: real constants, but strings instead. Integers are also supported if someone
    // %          note: chooses to create the constants themselves.
    // *     example 1: get_html_translation_table('HTML_SPECIALCHARS');
    // *     returns 1: {'"': '&quot;', '&': '&amp;', '<': '&lt;', '>': '&gt;'}
    var entities = {},
        hash_map = {},
        decimal;
    var constMappingTable = {},
        constMappingQuoteStyle = {};
    var useTable = {},
        useQuoteStyle = {};

    // Translate arguments
    constMappingTable[0] = 'HTML_SPECIALCHARS';
    constMappingTable[1] = 'HTML_ENTITIES';
    constMappingQuoteStyle[0] = 'ENT_NOQUOTES';
    constMappingQuoteStyle[2] = 'ENT_COMPAT';
    constMappingQuoteStyle[3] = 'ENT_QUOTES';

    useTable = !isNaN(table) ? constMappingTable[table] : table ? table.toUpperCase() : 'HTML_SPECIALCHARS';
    useQuoteStyle = !isNaN(quote_style) ? constMappingQuoteStyle[quote_style] : quote_style ? quote_style.toUpperCase() : 'ENT_COMPAT';

    if (useTable !== 'HTML_SPECIALCHARS' && useTable !== 'HTML_ENTITIES') {
        throw new Error("Table: " + useTable + ' not supported');
        // return false;
    }

    entities['38'] = '&amp;';
    if (useTable === 'HTML_ENTITIES') {
        entities['160'] = '&nbsp;';
        entities['161'] = '&iexcl;';
        entities['162'] = '&cent;';
        entities['163'] = '&pound;';
        entities['164'] = '&curren;';
        entities['165'] = '&yen;';
        entities['166'] = '&brvbar;';
        entities['167'] = '&sect;';
        entities['168'] = '&uml;';
        entities['169'] = '&copy;';
        entities['170'] = '&ordf;';
        entities['171'] = '&laquo;';
        entities['172'] = '&not;';
        entities['173'] = '&shy;';
        entities['174'] = '&reg;';
        entities['175'] = '&macr;';
        entities['176'] = '&deg;';
        entities['177'] = '&plusmn;';
        entities['178'] = '&sup2;';
        entities['179'] = '&sup3;';
        entities['180'] = '&acute;';
        entities['181'] = '&micro;';
        entities['182'] = '&para;';
        entities['183'] = '&middot;';
        entities['184'] = '&cedil;';
        entities['185'] = '&sup1;';
        entities['186'] = '&ordm;';
        entities['187'] = '&raquo;';
        entities['188'] = '&frac14;';
        entities['189'] = '&frac12;';
        entities['190'] = '&frac34;';
        entities['191'] = '&iquest;';
        entities['192'] = '&Agrave;';
        entities['193'] = '&Aacute;';
        entities['194'] = '&Acirc;';
        entities['195'] = '&Atilde;';
        entities['196'] = '&Auml;';
        entities['197'] = '&Aring;';
        entities['198'] = '&AElig;';
        entities['199'] = '&Ccedil;';
        entities['200'] = '&Egrave;';
        entities['201'] = '&Eacute;';
        entities['202'] = '&Ecirc;';
        entities['203'] = '&Euml;';
        entities['204'] = '&Igrave;';
        entities['205'] = '&Iacute;';
        entities['206'] = '&Icirc;';
        entities['207'] = '&Iuml;';
        entities['208'] = '&ETH;';
        entities['209'] = '&Ntilde;';
        entities['210'] = '&Ograve;';
        entities['211'] = '&Oacute;';
        entities['212'] = '&Ocirc;';
        entities['213'] = '&Otilde;';
        entities['214'] = '&Ouml;';
        entities['215'] = '&times;';
        entities['216'] = '&Oslash;';
        entities['217'] = '&Ugrave;';
        entities['218'] = '&Uacute;';
        entities['219'] = '&Ucirc;';
        entities['220'] = '&Uuml;';
        entities['221'] = '&Yacute;';
        entities['222'] = '&THORN;';
        entities['223'] = '&szlig;';
        entities['224'] = '&agrave;';
        entities['225'] = '&aacute;';
        entities['226'] = '&acirc;';
        entities['227'] = '&atilde;';
        entities['228'] = '&auml;';
        entities['229'] = '&aring;';
        entities['230'] = '&aelig;';
        entities['231'] = '&ccedil;';
        entities['232'] = '&egrave;';
        entities['233'] = '&eacute;';
        entities['234'] = '&ecirc;';
        entities['235'] = '&euml;';
        entities['236'] = '&igrave;';
        entities['237'] = '&iacute;';
        entities['238'] = '&icirc;';
        entities['239'] = '&iuml;';
        entities['240'] = '&eth;';
        entities['241'] = '&ntilde;';
        entities['242'] = '&ograve;';
        entities['243'] = '&oacute;';
        entities['244'] = '&ocirc;';
        entities['245'] = '&otilde;';
        entities['246'] = '&ouml;';
        entities['247'] = '&divide;';
        entities['248'] = '&oslash;';
        entities['249'] = '&ugrave;';
        entities['250'] = '&uacute;';
        entities['251'] = '&ucirc;';
        entities['252'] = '&uuml;';
        entities['253'] = '&yacute;';
        entities['254'] = '&thorn;';
        entities['255'] = '&yuml;';
    }

    if (useQuoteStyle !== 'ENT_NOQUOTES') {
        entities['34'] = '&quot;';
    }
    if (useQuoteStyle === 'ENT_QUOTES') {
        entities['39'] = '&#39;';
    }
    entities['60'] = '&lt;';
    entities['62'] = '&gt;';


    // ascii decimals to real symbols
    for (decimal in entities) {
        if (entities.hasOwnProperty(decimal)) {
            hash_map[String.fromCharCode(decimal)] = entities[decimal];
        }
    }

    return hash_map;
}

/*
 * https://raw.github.com/kvz/phpjs/master/functions/strings/html_entity_decode.js
 */
function html_entity_decode (string, quote_style) {
    // http://kevin.vanzonneveld.net
    // +   original by: john (http://www.jd-tech.net)
    // +      input by: ger
    // +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
    // +    revised by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
    // +   bugfixed by: Onno Marsman
    // +   improved by: marc andreu
    // +    revised by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
    // +      input by: Ratheous
    // +   bugfixed by: Brett Zamir (http://brett-zamir.me)
    // +      input by: Nick Kolosov (http://sammy.ru)
    // +   bugfixed by: Fox
    // -    depends on: get_html_translation_table
    // *     example 1: html_entity_decode('Kevin &amp; van Zonneveld');
    // *     returns 1: 'Kevin & van Zonneveld'
    // *     example 2: html_entity_decode('&amp;lt;');
    // *     returns 2: '&lt;'
    var hash_map = {},
        symbol = '',
        tmp_str = '',
        entity = '';
    tmp_str = string.toString();

    // should not using "this", because this is K
    // if (false === (hash_map = this.get_html_translation_table('HTML_ENTITIES', quote_style))) {
    if (false === (hash_map = get_html_translation_table('HTML_ENTITIES', quote_style))) {
        return false;
    }

    // fix &amp; problem
    // http://phpjs.org/functions/get_html_translation_table:416#comment_97660
    delete(hash_map['&']);
    hash_map['&'] = '&amp;';

    for (symbol in hash_map) {
        entity = hash_map[symbol];
        tmp_str = tmp_str.split(entity).join(symbol);
    }
    tmp_str = tmp_str.split('&#039;').join("'");

    return tmp_str;
}
exports.htmlEntityDecode = html_entity_decode;

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
