var _ = require('underscore')._
  , fs = require('fs')
  , methods = exports
  , http = require('http')
  , url = require('url')
  , path = require('path')
  , child_process = require('child_process')
;

function repeat(s, n){
  var a = [];
  while(a.length < n){
    a.push(s);
  }
  return a.join('');
}


// following methods are kind of subset of the "path" from nodejs
// should work the same but take no "p" arguments
exports.dirname = function() {
  return require('path').join(this.parents);
};
exports.basename = function(ext) {
  if (!_.isFunction(this.has))  {
    K.log('error', 'content', 'This is not a valid object', this);
//    K.log('error', 'content', );
    console.trace();
    return '';
  }
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
  return path
    .normalize(
      this.Kern.contentDir() +'/'+ (
        this.parents || []).join('/') 
        +'/'+ this.get('name')
      )
//      .split('(').join('\(')
//      .split('(').join('\)')
    ;
};

//exports.toJSON = function() {
//  if (!this.scanned) this.scan();
//  var additions = {
//    children : []
//  };
//  if (this.children)
//    additions.children = _
//        .reject(this.children.toJSON(),
//            function(child) {
//              return child.name.substr(0, 1) == '.'
//                  || child.name.substr(child.name.length - 1,
//                      child.name.length) == '~';
//            });
//  return _.extend(_.clone(this.attributes), {title: this.title()}, additions);
//};


exports.scanned = false;

exports.scan = function(cb) {
  var CE = this
    , absPath = CE.absPath()
    , stats = false
  ;
  try {
    stats = fs.statSync(absPath);
  }
  catch (e) {
    CE.Kern.log('error', 'content', 'Could not stat '+ absPath);
    return;
  }
  CE.scanned = true;
  

  if (!stats) return CE.set({error: new Error('Can not stat')}, {silent: true});
  _.extend(this, stats);

  
  var rec = K.paths[CE.id];
  
  if (this.isDir()) {
    K.log('info', 'content', 'Scanning directory '+ CE.id);
    this.unset('mime', {silent: true});
    
    function readDir(err, files){
      if (err) return CE.set({error: err}, {silent: true});
      
      for (var f in files) {
        var isHidden = files[f].substr(0, 1) == '.';
        if ((isHidden && K.settings.noHidden === false) || !isHidden) {
          var exists = false;
          CE.children.each(function(c, i){
            if (c.absPath() == absPath +'/'+ files[f]) exists = i;
          });
          
          if (exists === false) {
            var child = {
              name:         files[f],
              mime:         require('mime').lookup(files[f]),
              hidden:       files[f].substr(0, 1) == '.',
              noMenu:       isHidden,
              depth:        CE.get('depth') + 1,
              parents:      absPath.split(K.contentDir()).pop().split('/')
            };

            if (/index\.(html|json)$/i.test(child.name)) {
              child.hidden = true;
              child.depth--;
            }
            
            child.id = path.normalize(child.parents.join('/') + '/' + child.name);
            
            CE.children.add(child);
          
          }
        }
      }
    }
    
    if (CE.get('depth') < CE.Kern.settings.crawlMaxDepth) {
      fs.readdir(absPath, readDir);
    }
  }
  else {
//    K.log('info', 'content', 'Scanning file '+ CE.id +" - "+queue.length);
    var info = CE.attributes;
    info.mime = require('mime').lookup(absPath);
    var parsers = require('./content/parsers/index');
    var parser = parsers.atPath(absPath);

    if (_.isFunction(parser)) {
      parser.call(CE, info, function(err, collected){
        if (err) throw err;
        collected = collected || {regions:{}};
        collected.regions = collected.regions || {};
        if (/index\.(json|html)$/i.test(absPath)) {
          collected.hidden = true;
          collected.noMenu = false;
          K.log('info', 'content', 'Index found, parent: '+ CE.parent().set({
            title: collected.title
          }, {silent: true}));
        }

        K.log('info', 'content', 'Collected information for '+ CE.id, _.toArray(collected.regions).length, 'hidden? '+ collected.hidden, 'noMenu? '+ collected.noMenu);
        K.log('debug', 'content', 'Collected', collected);
        if (path.basename(absPath) == 'roadmap.html') {
          K.log('debug', 'roadmap', 'Collected', collected);
        }
        CE.set(collected, {silent: true});
      }, false);
    }
    else {
      K.log('error', 'content', 'No parser found for '+ absPath, parsers);
    }

  }
  
  if (_.isFunction(cb)) cb.call(CE);
};





exports.registerPath = function() {
  var CE = this, K = CE.Kern;
  if (CE.error || CE.isNew() || (CE.has('hidden') && CE.get('hidden'))) return;
  var path = CE.id.substr(1, CE.id.length);
  if (!_.find(K.app.routes.routes.get, function(p){
    return path == p.path;
  })) {
//    K.app.get(CE.id.replace(/(\(|\))/g, '\\('), K.pathRequestCallback);
    // K.app.get(CE.id, K.sendContent);
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
  

  var children = CE.attributes.children || [];
  children = _.isArray(children) ? children : _.toArray(children);
  CE.children = new K.collections.ContentChildren(children, options);
  delete CE.attributes.children;

  // TODO: can not create the parents from here, RangeError: Maximum call stack size exceeded
  // var parents = CE.attributes.parents || [];
  // parents = _.isArray(parents) ? parents : _.toArray(parents);
  // CE.parents = new K.collections.ContentParents(parents, options);
  // delete CE.attributes.parents;

  // to keep the code consistent, we will not use a collection
  // var parents = CE.attributes.parents || [];
  // parents = _.isArray(parents) ? parents : _.toArray(parents);
  // CE.parents = parents;
  // delete CE.attributes.parents;

  if (CE.has('parents')) {
    CE.parents = _.reject(_.toArray(CE.get('parents')), function(v){
      return _.isUndefined(v) || v == '';
    });
    CE.unset('parents');
  }


  K.trigger('contentprepare', CE);
  var isHidden = path.basename(absPath).substr(0, 1) == '.';
  if ((isHidden && K.settings.noHidden === false) || !isHidden) CE.scan();
  
  if (_.isUndefined(CE.id) || CE.id == 'undefined') {
    CE.set({url: '/'}, {silent: true});
  }
  CE.trigger('initialized');
  K.trigger('registerpath', CE);
  K.trigger('newcontent', CE);
  CE.bind('change', function(){ K.trigger('contentchange', CE); });
};


