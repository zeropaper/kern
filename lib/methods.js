var _ = require('underscore')._
  , fs = require('fs')
  , methods = exports
  , xml2js = require('xml2js')
  , http = require('http')
  , url = require('url')
  , child_process = require('child_process')
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
  
  
  if (ps.length < 1) {
    return false;
  }
  
  var short = '/'+ ps[0];
  var long = short +'.'+ ps[1];
  
  if (typeof K.paths[short] == 'object') {
    console.info('Found, short '+ short);
    return K.paths[short];
  }
  
  if (ps.length > 1 && typeof K.paths[long] == 'object') {
    console.info('Found, long '+ long);
    return K.paths[long];
  }
  
  for (var p in K.paths) {
    if (p.split(short) == 2) {
      return K.paths[p];
    }
  }
  
  if (ps.length > 1) {
    for (var p in K.paths) {
      if (p.split(long) == 2) {
        return K.paths[p];
      }
    }
  }
  
  return false;
};


function readSchema(schema) {
  var K = this
    , modelDefs = {}
  ;
  K.schema = schema;
  K.OWL = {Class:{}};
  K.dataModels = K.dataModels || {};
  
  
  function searchParentClass(rdfResource) {
    for (var n in K.schema['owl:Class']) {
      if (K.schema['owl:Class'][n]['@']['rdf:about'] == rdfResource) return K.schema['owl:Class'][n];
    }
    return {};
  }
  
  function getParentClass(parentResourceName) {
    if (typeof K.OWL.Class[parentResourceName] != 'object') {
      var parent = {
        label: parentResourceName
      };
      _.extend(parent, toObj(searchParentClass(parentResourceName)));
      K.OWL.Class[parentResourceName] = parent;
    }
    return K.OWL.Class[parentResourceName];
  }
  
  
  function toObj(O) {
    if (!_.isArray(O)) return {};
    var obj = {};
    for (var o in O) {
      var rdfs = {};
      for (var r in O[o]) {
        if (r.substr(0, 5) != 'rdfs:') continue;
        
        
        var rdfsName = r.substr(5, r.length);
        //console.info("-------------------------- "+ rdfsName);
        if (rdfsName == 'subClassOf') {
          //console.info('O[o][r].length', O[o][r].length);
          var parents = [];
          if (O[o][r].length) {
            for (var c in O[o][r]) {
              //console.info('Looking at key '+ c +" of "+ r);
              var parent = searchParentClass(O[o][r][c]['@']['rdf:resource']);
              parents.push(parent['rdfs:label']['#']);
            }
          }
          else {
            var parent = searchParentClass(O[o][r]['@']['rdf:resource']);
            parents.push(parent['rdfs:label']['#']);
          }
          rdfs[rdfsName] = parents;
          
          //console.info('Look for parent classes for '+ O[o]['rdfs:label']['#'] +":\n"+ rdfs[rdfsName].join(", "));
          
        }
        else if (rdfsName == 'domain' || rdfsName == 'range') {
          if (!O[o][r]['owl:Class'] || !O[o][r]['owl:Class']['owl:unionOf']) continue;
            
          var desc = O[o][r]['owl:Class']['owl:unionOf']['rdf:Description'];
          var union = [];
          if (desc.length) {
            for (var i in desc) {
              if (desc[i]['@']) {
                var c = searchParentClass(desc[i]['@']['rdf:about']);
                union.push(c['rdfs:label']['#']);
              }
            }
          }
          else {
            var c = searchParentClass(desc['@']['rdf:about']);
            union.push(c['rdfs:label']['#']);
          }
          rdfs[rdfsName] = union;
          //console.info('Look for '+ rdfsName +' classes for '+ O[o]['rdfs:label']['#'] +":\n"+ rdfs[rdfsName].join(", "));
        }
        else {
          rdfs[rdfsName] = O[o][r]['#'];
        }
        
      }
      obj[rdfs.label] = rdfs;
    }
    return obj;
  }
  for (var name in schema) {
    var info = schema[name];
    if (name.substr(0, 4) != 'owl:') continue;
    var ext = {};
    var prpName = name.substr(4, name.length);
    K.OWL[prpName] = typeof K.OWL[prpName] != 'object' ? {} : K.OWL[prpName];
    console.info("Adding "+ prpName);
    _.extend(K.OWL[prpName], toObj(info));
  }
  /*
  console.info("----------------- \n K.OWL keys", _.keys(K.OWL).join(", "));
  console.info("----------------- \n K.OWL.Class keys", _.keys(K.OWL.Class).join(", "));
  console.info("----------------- \n K.OWL.AnnotationProperty keys", _.keys(K.OWL.AnnotationProperty).join(", "));
  //console.info("----------------- \n K.OWL", K.OWL);
  */
}

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
    , parser = new xml2js.Parser()
    , schemaUrl = 'http://schema.org/docs/schemaorg.owl'
    , Downloader = require('./fs/fs').Downloader
  ;

  K.$ = $ || K.$ || require('jQuery');

    var dl = new Downloader(schemaUrl, function(localFile) {
      fs.readFile(localFile, function(err, data) {
        parser.parseString(data, function(err, result) {
          if (err) return console.error(err);
          try {
            readSchema.call(K, result);
          }
          catch (e) {
            console.error(e);
          }
        });
      });
    });
    dl.run();

  

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
    '/js/lib/*(css)': {
      noOutput: true,
      callback: function(asset, req, res, next) {
        res.sendfile(K.publicDir() + req.url, function(err){
          if (err) return next(err);
        });
      },
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
  };
  
  K.assets.scripts = {
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
  };
  
  
  K.assets.templates = {};
  var path = __dirname +'/common/templates.html';
  var templates = fs.readFileSync(path).toString()
    , $templates = $(templates)
  ;
  $('.kern-template,script[type="text/template"]', $templates).each(function(){
    if (!$(this).attr('id')) return;
    K.assets.templates[$(this).attr('id')] = $(this).html();
  });
  console.info("Kern templates", K.assets.templates);

  
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
  var $ = K.$;
  var path = path || K.publicDir() +'/layout.html';
  var layout = fs.readFileSync(path).toString()
    , $layout = $(layout)
  ;
  
  $('body').replaceWith($layout.children('body'));
  $('head').replaceWith($layout.children('head'));
  if (typeof cb == 'function') cb.call(K);
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
      if (typeof info.data != 'undefined') {
        //console.info('Injecting data for ' + info.path, info.data);
        parts.push(addStyleData('var ' + info.path + ' = _.extend(' + info.path + ' || {}, ' + JSON.stringify(info.data) + ');'));
      }
      else if (typeof info.content != 'undefined') {
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
      try {
        K.app.get(escape(f), methods.pathRequestCallback);
      }
      catch (e) {
        console.error('Could not register path for '+ f, e);
      }
    }
  }
};

methods.sendAsset = function(asset, req, res, next){
  K = K || this;
  console.info("Sending asset", asset);
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
          console.info('Asset requested '+ req.url, asset);
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
  app.get('/kern/schema.owl.js', function(req, res, next){
    res.json(K.OWL || {});
  });
  app.get('/kern/schema.js', function(req, res, next){
    res.json(K.schema || {});
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
  
  
  K.registerPaths();
  K.registerAssets();
  
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
            /*
            (function(info){
              info.meta = {};
              var cmd = 'LANGUAGE=en extract --hash=sha1 ' + absPath;
              child_process.exec(cmd, function(error, stdout, stderr) {
                
                _.each(stdout.toString().split("\n"), function(val, key) {
                  var name = val.split(' - ').shift().toLowerCase();
                  info.meta[name] = val.split(' - ').pop();
                });
                
                delete info.meta.mimetype;
                CE.children.add(info);
              });
            })(child);
            */
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
//    console.info('Analysing '+ CE.absPath());
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
        console.error(e);
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
  if (mimeTest) return;
  var absPath = CE.absPath() || K.contentDir() + CE.get('url');
  
  function changed(){
    
  };
  
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
