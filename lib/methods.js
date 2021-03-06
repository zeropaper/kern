var _ = require('underscore')._
  , fs = require('fs')
  , kern = exports // Kern.prototype
  , http = require('http')
  , path = require('path')
  , url = require('url')
  , child_process = require('child_process')
  , queue = []
  , current = false
  , runningQueue = false
;

_.extend(kern, require('./common/methods'));
_.extend(kern, require('./sys'));

kern.fs = require('./fs/fs');

var commonFS = require('./common/methods').fs;
kern.fs = _.extend(commonFS, kern.fs);
kern.onServer = true;

queueProcess = function() {
  
  if (current !== false) return;
  current = queue.pop();
  current.call(queue);

  //  
  //  var params = queue.pop();
  //  current = params.context.get('id');
  //  
  //  if (_.isFunction(params.parser)) {
  //    
  //    params.parser.call(params.context, params.info, params.cb, false);
  //  }
  //  else {
  //    K.log('error', 'queue', 'No parser defined for ', current);
  //    current = false;
  //  }
  //  
  
  if (!queue.length) return clearInterval(runningQueue);
};

kern.queueAdd = function(fn) {
  var K = this;
  
  if (!_.isFunction(fn)) {
    K.log('error', 'queue', 'The given argument is not a function.');
    return;
  }
  
  queue.push(fn);
  
  if (!runningQueue) {
    runningQueue = setInterval(queueProcess, 10);
  }
};


kern.contentDir = function(newPath) {
  if (_.isString(newPath)) {
    if (fs.stat(newPath).isDirectory()) {
      this.settings._contentDir = newPath;
      
      this.struct = new this.models.contentEntry({}, {
        Kern: this,
        isRoot: true
      });
      
    }
    else {
      
    }
  }
  return this.settings._contentDir;
};

_.extend(kern.contentEntry, require('./contentEntry.js'));


kern.publicDir = function() {
  return this.settings._publicDir;
};



kern.cacheDir = function() {
  return this.settings._cacheDir;
};


kern.lookup = function (params) {
  if (params.length < 1) return false;
  
  var K = this;
  var s = '/'+ params[0];
  var l = s +'.'+ params[1];
  
  if (typeof K.paths[s] == 'object') {
    
    return K.paths[s];
  }
  
  if (params.length > 1 && typeof K.paths[l] == 'object') {
    
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

kern.initialize = function() {
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
  K.isRunning = false;
  K.bind('initialized', function() {
    
    _.each(K.assets.scripts, function(script){
      
    });
  });

  K.$ = $ || K.$ || require('jQuery');
  
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.cookieParser());
  //app.use(express.vhost('irata.loc'));

  // session handling if settings are defined
  if (typeof S._session == 'object') {
    var MemoryStore = express.session.MemoryStore;
    app.use(express.session(_.extend({
      store: new MemoryStore()
    }, S._session)));
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
  app.set('views', S._publicDir);

  







  K.app = app;
  
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
    '/css/style.css': {
      filepath: K.publicDir() +'/css/style.css',
      callback: staticDelivery,
      weight: 50
    },
    '/fonts/*': {
      noOutput: true,
      callback: staticDelivery
    },
    '/images/*': {
      noOutput: true,
      callback: staticDelivery
    },
    '/favicon.*': {
      noOutput: true,
      callback: staticDelivery
    },
    '/js/lib/jquery-ui/themes/base/*.css': {
      noOutput: true,
      callback: staticDelivery,
      weight: -50
    }
  });
  
  
  
  
  _.extend(K.assets.scripts || (K.assets.scripts = {}), {
    '/js/lib/*': {
      noOutput: true,
      callback: staticDelivery
    },
    /*
    '/js/lib/modernizr.js': {
      weight: -100
    },
    '/js/lib/respond.min.js': {
      weight: -99
    },
    */
    '/underscore.js': {
      filepath: path.dirname(require.resolve('underscore')) + '/underscore-min.js',
      weight: -98
    },
    
    
    '/js/lib/jquery-ui/jquery-1.7.2.js': {
      //filepath: path.dirname(require.resolve('jQuery')) + '/node-jquery.js',
      weight: -97
    },
    
    
    '/backbone.js': {
      filepath: path.dirname(require.resolve('backbone')) + '/backbone.js',
      weight: -96
    },
    '/backbone-localstorage.js': {
      filepath: path.dirname(require.resolve('backbone')) + '/examples/backbone-localstorage.js',
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
    /*
    */
    '/js/script.js': {
      filepath: K.publicDir() + '/js/script.js',
      weight: 50
    }
  });
  
  
  K.assets.templates = K.assets.templates || (K.assets.templates = {});
  var templatepath = __dirname +'/common/templates.html';
  K.loadTemplates(templatepath);
  
  
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
    // '/kern.min.js': {},
  });
  
  K.app.error(function(err, req, res, next) {
    return K.loadLayout(function() {
      
      
      K.log('error', 'error', 'Error page error', err, err.stack);
      
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
};


kern.assetFromURL = function(assetURL) {
  var K = this;

  function find(item, u) {
    return u == assetURL;
  }
  
  for (var assetType in K.assets) {
    var s = _.find(K.assets[assetType], find);
    if (s) return _.extend({type: assetType, assetURL: assetURL}, s);
  }
  return false;
};

kern.assetFromFilepath = function(filepath) {
  var K = this;

  for (var assetType in K.assets) {
    for (var assetURL in K.assets[assetType]) {
      if (filepath == K.assets[assetType][assetURL].filepath) return _.extend({type: assetType, assetURL: assetURL}, K.assets[assetType][assetURL]); 
    }
  }
  return false;
};

kern.assetFilepathToURL = function(filepath) {
  var K = this;
  
  var returned = false;
  var s = K.assetFromFilepath(filepath);
  if (s) returned = s.assetURL;
  return returned;
};

kern.notify = function(tmpl, vars, opt){
  K = K || this;
  var args = _.toArray(arguments);
  vars = vars || {};
  opt = opt || {};
  
  try {
    args = [
        "-u", opt.urgency || "normal"
      , "-i", K.publicDir() +"/apple-touch-icon.png"
    ];
    args.push('"'+ (vars.title || '').split(' ').join('\ ') +'"');
    args.push('"'+ (vars.text || '').split(' ').join('\ ') +'"');
    require('child_process').exec("notify-send "+ args.join(' '));
  }
  catch (e) {
    K.log('error', '', e);
  }
  
  if (opt.socketEvent) {
    try {
      K.io.sockets.emit(opt.socketEvent, opt.socketData || {});
    }
    catch(e) {
      K.log('error', '', e);
    }
  }
  if (typeof opt.callback == 'function') opt.callback.call(K, vars, opt);
};

_.extend(kern, require(__dirname + '/compass/compass.js'));

// kern.manifest = function(){
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







kern.sendContent = function(req, res, next) {
  if (!require('./kern').isKern(this)) {
    K.log('error', 'sendContent', '"this" is not Kern', this);
    return next(new Error('Not a valid Kern object'));
  }
  var fileURL = req.url.split('?').shift()
    , K = this
    , S = K.settings
    , ext = fileURL.split('/').pop().split('?').shift().split('.').pop()
    , exp = S.staticExtExp
    , staticDelivery = exp.test(fileURL) || !_.isUndefined(req.query.raw)
  ;
  
  
  if (!_.isUndefined(req.query._escaped_fragment_)) {
    fileURL = req.query._escaped_fragment_;
  }


  
  
  if (staticDelivery) {
    if (S.staticUseCDN) {
      var cdnURL = 'http://'+ S.staticHostname + (S.staticPort != 80 ? S.staticPort : '') + S.staticPath;
      
      return res.redirect(cdnURL, 301);
    }
    
    
    return res.sendfile(K.contentDir() + fileURL, function(err, data) {
      if (err) return next(err);
    });
  }
  
  res.send(K.applyFile(fileURL, req, res, next));
};

kern.loadLayout = function(cb, layoutpath) {
  K = K || this;
  var $ = K.$;
  var layoutpath = layoutpath || K.publicDir() +'/layout.html';
  var layout = fs.readFileSync(layoutpath).toString()
    , $layout = $(layout)
  ;
  
  

  $('body').replaceWith($layout.children('body'));
  $('head').replaceWith($layout.children('head'));
  if (typeof cb == 'function') cb.call(K);
};

kern.loadTemplates = function(templatespath) {
  var K = this;
  var $ = K.$;
  var templates = fs.readFileSync(templatespath).toString()
    , $templates = $(templates)
    , $tmpls = $('script[type="text/template"]', $templates)
    , $scripts = $('script[type="text/kern-javascript"]', $templates)
    , $styles = $('style.kern-style', $templates)
  ;

  
  // $tmpls.each(function() {
  //   var $el = $(this);
  //   var id = $el('attr', 'id');
  //   K.assets['templates'][id] = {
  //     weight: ($el.attr('data-weight') || 0),
  //     content: $(this).html()
  //   };
  // });

  // $scripts.each(function() {
  //   var $el = $(this);
  //   var id = $el.attr('src') ? $el.attr('src') : $el('attr', 'id');
  //   K.assets['scripts'][id] = {
  //     weight: ($el.attr('data-weight') || 0),
  //     content: $(this).html()
  //   };
  // });
  
  // $styles.each(function() {
  //   var $el = $(this);
  //   var id = $el.attr('href') ? $el.attr('href') : $el('attr', 'id');
  //   K.assets['styles'][id] = {
  //     weight: ($el.attr('data-weight') || 0),
  //     content: $(this).html()
  //   };
  // });



  function apply() {
    if (!$(this).attr('id')) return;
    
    var $el = $(this);
    var type = $el.hasClass('kern-style') ? 'styles' : (/kern-javascript/i.test($el.attr('type')) ? 'scripts' : 'templates');

    var id = $el.attr('id');
    if (type == 'styles' && $el.attr('href')) {
      id = $el.attr('href');
    }
    else if (type == 'scripts' && $el.attr('src')) {
      id = $el.attr('src');
    }

    K.assets[type][id] = (type == 'templates' ? $(this).html() : {
      weight: ($el.attr('data-weight') || 0),
      content: $(this).html()
    });
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

function renderStylesAssets(compressed) {
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
  
  _.each(K.assets.styles, function(info, assetpath) {
    css.push(_.extend({path: assetpath, weight: 0}, info));
  });
  _.each(css.sort(assetsSorting), function(info) {
    
    if ((!info.section || info.section != '# rev ') && !info.noOutput) {
      if (_.isString(info.content)) {
        
        parts.push(addStyleData(info.content));
      }
      else {
        
        parts.push(addStyleFile(info.path));
      }
    }
  });
  
  return parts.join("\n\n");
}


function renderScriptsAssets(compressed) {
  var K = this;
  var inlineScripts = [];
  var fileScripts = [];
  var parts = [];
  
  // @todo some aggregation
  
  function addScriptFile(url) {
    if (compressed) {
      // test external URLs
      var urlObj = require('url').parse(url);
      if (!_.isUndefined(urlObj.host)) return;
      // seems legit to think the "url" points to something local
      return "\n\n\n// Content of "+ url +"\n"+ fs.readFileSync(url).toString();
    }
    return '<script type="text/javascript" src="' + url + '"></script>';
  }
  function addScriptData(data) {
    if (compressed) return data;

    var parts = ['<script type="text/javascript">', '//<![CDATA[', data, '//]]>', '</script>'];
    return parts.join("\n");
  }
  function addScriptFileCDN(url, test, fallback) {
    if (compressed) return '';

    var parts = ['', '<!-- CDN -->', addScriptFile(url), addScriptData(test + ' || document.write(\'<script type="text/javascript" src="' + fallback + '"><\\/script>\');'), ''];
    return parts.join("\n");
  }
  
  
  
  var js = [];
  _.each(K.assets.scripts, function(info, assetpath) {
    js.push(_.extend({path: assetpath, weight: 0}, info));
  });
  _.each(js.sort(assetsSorting), function(info) {
    if ((!info.section || info.section != '# rev ') && !info.noOutput) {
      if (typeof info.cdn == 'object') {
        
        parts.push(addScriptFileCDN(info.cdn.url, info.cdn.test, info.path));
      }
      else if (typeof info.data != 'undefined') {
        
        parts.push(addScriptData('var ' + info.path + ' = _.extend(' + info.path + ' || {}, ' + JSON.stringify(info.data) + ');'));
      }
      else if (typeof info.content != 'undefined') {
        
        parts.push(addScriptData(info.content));
      }
      else {
        
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
 * Function kern.applyFile
 * Apply the information about a file into the page
 */
kern.applyFile = function(fileURL, req, next) {
  fileURL = unescape(fileURL);
  K = K || this;
  var $ = K.$;
  
  
  file = fileURL == '/' || fileURL == '/' ? K.struct : (_.isString(fileURL) ? K.paths[fileURL] : false);
  if (!file || !_.isFunction(file.get)) {
    throw new K.errors.NotFound('Could not load "'+ fileURL +'"');
  }
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

  K.loadLayout(function() {
    
  });

  K.apply(file);
  

  var flashes = {};
  if (_.isFunction(req.flash)) req.flash();


  function clientEscape(obj, key) {
    var copy = _.clone(obj);
    _.each(
      copy,
      function(subObj, subKey) {
        if (_.isString(subKey) && subKey.substr(0, 1) == '_') {
          delete copy[subKey];
        }
        else if (_.isObject(subObj)) {
          copy[subKey] = clientEscape(subObj);
        }
      })
    ;
    return copy;
  }

  _.extend(K.assets.scripts, {
    settings: {
      weight: -10,
      data: clientEscape(K.settings)
    },
    startup: {
      weight: 10,
      content: 'var kern = new Kern(settings);'+
        'var flashes = ' + JSON.stringify(flashes) + ';'+
 //       '// K.log("flashes",flashes);'+
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







kern.adminCredential = function() {
  // K.log(require.main.ADMINCREDENTIALS);
  return 'admin:secret';//require.main.ADMINCREDENTIALS;
};

kern.basicAuth = function(req, res, next) {
  if (req.headers.authorization && req.headers.authorization.search('Basic ') === 0) {
    // fetch login and password
    if (new Buffer(req.headers.authorization.split(' ')[1], 'base64').toString() == kern.adminCredential()) {
      next();
      return;
    }
  }
  
  
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


kern.pathRequestCallback = function(req, res, next){
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


kern.sendAsset = function(asset, req, res, next){
  K = K || this;
  if (!asset.filepath) return next(new Error('No filepath for asset'));
  
  res.sendfile(asset.filepath, function(err) {
    if (err) {
      next(err);
    }
    else {
      
    }
  });
};

kern.registerAssets = function() {
  K = K || this;
  
  
  K.app.get('/kern.templates.js', function(req, res, next) {
    
    if (_.isString(req.query.name)) return res.send(K.getTemplate(req.query.name));
    return res.send(K.assets.templates);
  });
  
  for (var t in _.clone(K.assets)) {
    if (t == 'templates') continue;
    var type = K.assets[t];
    
    for (var a in type) {
      (function(info){
        var asset = _.extend({
          type: t,
          path: typeof info.path == 'string' ? info.path : a
        }, info);
        
        if (!_.isFunction(asset.callback) && !_.isString(asset.filepath)) return;
        var cb = typeof asset.callback == 'function' ? asset.callback : kern.sendAsset;
        
        
        K.app.get(asset.path, function(req, res, next) {
          
          cb.call(K, asset, req, res, next);
        });
      })(type[a]);
    }
  }
};

/**
 * Starts the server
 */
kern.serve = function() {
  if (!require('./kern').Kern.isKern(this)) {
    throw new Error('Can not serve, not a valid Kern object');
  }
  
  K = this;
  K.isRunning = true;
  var express = require('express')
    , S = K.settings
    , app = K.app
    , fs = require('fs')
  ;
  
  
  app.registerDefault = 'html';
  app.register('html', require('./fs/delivery'));
  app.set('views', K.publicDir());
  
  
  app.get('/', function(req, res, next){
    K.sendContent(req, res, next);
  });





  app.get('/cache.manifest', function(req, res, next){
    var manifest = K.manifest();
    
    return res.send(manifest, { 'Content-Type': 'text/cache-manifest' }, 200);
  });
  






  app.get('/kern/files.js', function(req, res, next) {
    function remove(obj) {
      // if (typeof obj.content == 'string') {
      //   delete obj.content;
      // }
      // for (var c in obj.content) {
      //   obj.children[c] = remove(obj.children[c]);
      // }
      
      obj.children = _.map(obj.children, remove);
      _.each(K.get('JSONExcludedAttributes', [
        'absPath',
        'error',
        'err',
        'libs',
        'data',
        'models',
        'collections',
        'views',
        'routers',
        'url',
        'controller',
        'parents',
        'refs',
        'image',
        'description',
        'regions',
        'scripts',
        'navigation',
        'children'
        ]), function(name){
        delete obj[name];
      });
      return obj;
    };



    var kk, od = 0;
    function verifJSON(o, k) {
      var str;
      
      if (od >= 20) return false; 
      try {
        str = JSON.stringify(o);
        
        return true;
      }
      catch (error) {
        
        if (k) {
          kk = (kk || 'object')+'.'+k;
        }
        else {
          kk = 'object';
        }
        
        od++;
        try {
          _.each(o, function(so, sk){
            verifJSON(so, sk);
          });        
        } catch (e){}
        od--;
        return false;
      }
      return true;
    };
    
    
    
    var maxDepth = req.query.maxdepth || 2
      , from = req.query.from || '/'
      , S = from == '/' ? K.struct : K.paths[from]
    ;
    
    
    
    
    if (!S) return res.send(500);
    var obj = {};
    try {
      obj = remove(S.toJSON());
    }
    catch (e) {
      obj = {
        json: S.toJSON(),
        message: e.message,
        stack: e.stack
      };
    }

    if (verifJSON(obj)) {
      
      res.send(obj);
    }
    else {
      res.send({
        error: 'Could not stringify JSON'
      }, 500);
    }
    // res.send(string, {'Content-Type': 'application/json'}, );
  });
  
  
  app.get(/^\/kern\/(.*)\.json$/i, function(req, res, next){
    var path = '/'+ req.params.join('');
    return res.json(K.paths[path]);
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
    

    
    _.map(files, function(file, key){
      content = content + "\n// "+ file +"\n"+ fs.readFileSync(file).toString();
    });
    

    // TODO: adding the inline scripts assets to the 
    
    content += renderScriptsAssets(true);

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
    
    
  });
  K.app.get(':contentEntryPath', function(req, res, next){
    
    next();
    //K.sendContent(req, res, next);
    //throw new K.errors.NotFound(req.url +' could not be found');
  });
  
  
  K.app.get('*', function(req, res, next){
    return K.sendContent(req, res, next);
    debugger;
    throw new K.errors.NotFound(req.url +' could not be found');
  });
  
  K.app.listen(S.port, S.hostname);
  
  K.trigger('listenning', app);
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

