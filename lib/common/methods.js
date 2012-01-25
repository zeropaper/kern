(function(wexpows) {
  var kern = {} // Kern kern
  , ce = {} // contentEntry model description
  , cc = {} // contentChildren collection description
  , cp = {} // contentParents collection description
  , models = {}, collections = {}, views = {}
  , onServer = typeof window === 'undefined' // boolean name says it all
  // TODO: weird: "...,.ajax-processed"
  , AJAXLinkSelector = 'a[href^="/"]:not([href^="//"],.ajax-processed)' // used to find internal, AJAX links
  , _, K, socket, AJAXCache = {
    elements : {},
    urls : {}
  };

  if (onServer) {
    _ = require('underscore')._;
    $ = require('jQuery');
    Backbone = require('backbone');
  } else {
    _ = window._;
    $ = window.jQuery || window.Zepto;
    Backbone = window.Backbone;
  }

  kern.get = function(key) {
    return this.settings[key];
  };
  kern.has = function(key) {
    return !_.isUndefined(this.settings[key]);
  };
  kern.set = function(vars) {
    _.extend(this.settings || {}, vars || {});
  };

  ce = {
    defaults : {
      parents: [],
      noMenu : true,
      hidden : true,
      depth : 0
    },
    urlRoot: ''
  };
  
  ce.url = function() {
    return this.id;
  };
  
  ce.load = function() {
    var K = this.Kern;
    K.fs.getFiles.call(K, this.url(), function() {
      console.info(arguments);
    });
  };

  ce.initialize = function(attributes, options) {
    K = K || options.Kern;
    var CE = this;
    CE.Kern = K;

    _.extend(CE.attributes, CE.defaults, attributes);

    CE.children = new K.collections.ContentChildren();
    if (CE.has('children')) {
      CE.children.add(CE.get('children'));
      CE.unset('children');
    }

    
    if (CE.has('mime')) {
      CE.mime = CE.get('mime');
      CE.unset('mime');
    }
    
    if (CE.has('parents')) {
      CE.parents = _.reject(_.toArray(CE.get('parents')), function(v){
        return _.isUndefined(v) || v == '';
      });
      CE.unset('parents');
    }


    if (CE.has('error') || CE.err) {
      var e = CE.has('error') ? CE.get('error') : CE.err;
      // CE.set({
      //   title  : CE.has('title') ? CE.get('title') : 'Error',
      //   noMenu : true,
      //   hidden : true,
      //   regions: CE.has('regions') ? CE.get('regions') : {
      //     main: '<h2>Error '+ (!_.isUndefined(e.code) ? ': '+ e.code : '') +'</h2>'
      //   }
      // }, {
      //   silent : true
      // });
      return;
    }

    var index = CE.children.find(function(child) {
      return /^(index|readme)/i.test(child.basename());
    });

    if (index) {
      index.set({
        noMenu : true,
        hidden : true
      }, {
        silent : true
      });

      CE.set({
        title: index.title(),
        regions: (index.get('regions') || {}),
        noMenu: true
      }, {
        silent: true
      });
    }

    var cover = CE.children.find(function(child) {
      return /^cover\.(jpg|png|gif)/i.test(child.basename());
    });

    if (cover) {
      CE.image = cover.cover();
      cover.set({
        noMenu : true,
        hidden : true
      }, {
        silent : true
      });
    }

    if (!CE.has('error') && !_.isUndefined(CE.id)) {
      K.paths[CE.id] = CE;
      K.trigger('newcontent', CE);
      CE.bind('change', function(){
        K.trigger('contentchange', CE, '#!'+ CE.id == window.location.hash);
      });
    }
  
    if (_.isUndefined(CE.id) || CE.id == 'undefined') {
      CE.set({url: '/'}, {silent: true});
    }
    CE.trigger('initialized');
    K.trigger('registerpath', CE);
    K.trigger('newcontent', CE);
    CE.bind('change', function(){ K.trigger('contentchange', CE); });
  };


  // following kern are kind of subset of the "path" from nodejs
  // should work the same but take no "p" arguments

  ce.dirname = function() {
    return this.parents.join('/');
  };
  ce.basename = function(ext) {
    var name = this.get('name');
    if (!name)
      return '';
    if (!ext)
      return name;
    return name.split(ext).join('');
  };
  ce.extname = function() {
    var ext = this.get('name').split('.');
    return ext.length > 1 ? '.' + ext.pop() : '';
  };
  ce.exists = function(cb) {
    // ...
  };
  ce.existsSync = function() {
    return true;
  };
  ce.childPaths = function() {
    var flat = {};
    this.children.each(function(child, c) {
      flat[child.id] = child;
      _.extend(flat, child.childPaths());
    });
    return flat;
  };
  ce.isDir = function() {
    return this.children.length > 0;
  };
  ce.isFile = function(f) {
    return _.isUndefined(this.children);
  };
  ce.hasChildren = function(invisible) {
    if (!this.isDir())
      return false;
    for ( var c in this.children) {
      if (!this.children[c].isEmpty())
        return true;
    }
    return true;
  };

  /*
   * 
   */
  ce.isEmpty = function(invisible) {
    if (this.isFile()) {
      if (typeof this.regions != 'object')
        return true;
      if (!this.regions.length)
        return true;
      for ( var r in this.regions) {
        if (this.regions[r].length)
          return false;
      }
      return true;
    }
    return this.hasChildren(invisible);
  };

  /*
   * 
   */
  ce.isIndex = function() {
    return this.isFile() && !this.get('hidden')
        && this.basename() == 'index.html';
  };

  /*
   * 
   */
  ce.hasIndex = function(f) {
    if (this.isFile() || !this.isDir())
      return false;
    for ( var m in this.children.models) {
      var model = this.children.models[m];
      if (model.basename() == 'index.html')
        return true;
    }
  };

  /*
   * 
   */
  ce.toJSON = function() {
    var additions = {
      children : [],
      title: this.title(),
      parents: this.parents
    };
    if (this.children)
      additions.children = /*_
          .reject(this.children.toJSON(),
              function(child) {
                return child.name.substr(0, 1) == '.'
                    || child.name.substr(child.name.length - 1,
                        child.name.length) == '~';
              })*/this.children.toJSON();
    if (this.mime) additions.mime = this.mime; 
    return _.extend(_.clone(this.attributes), additions);
  };

  /*
   * 
   */
  ce.title = function() {
    var title = _.isFunction(this.has) && this.has('title') ? this.get('title') : false;
    if (_.isString(title) && title && title.length > 0)
      return title;
    
    if (!_.isUndefined(this.children) && this.children.length) {
      for ( var c in this.children.models) {
        if (this.children.models[c].basename() == 'index.html') {
          return this.children.models[c].title();
        }
      }
    }
    
    return this.basename().split('.').shift();
  };

  ce.eachParents = function(cb) {
    var returned = [];
    var CE = this;
    if (!_.isArray(CE.parents)) {
      return;
    }
    _.each(CE.parents, function(v, k){
      var id = '/'+ CE.parents.slice(0, CE.parents.length - k).join('/');
      returned.push(CE.Kern.paths[id]);
      if (_.isFunction(cb)) cb(CE.Kern.paths[id], k);
    });
    return returned;
  };
  ce.eachParentsObject = function(cb) {
    var parents = {};
    _.each(this.eachParents(cb), function(model) {
      parents[model.id] = model;
    });
    return parents;
  };


  ce.parent = function() {
    var CE = this;
    if (!_.isArray(CE.parents)) {
      return;
    }
    var parentId = '/'+ CE.parents.join('/');
    var p = CE.Kern.paths[parentId];
    CE.Kern.log('info', 'content', 'Parent '+parentId+ ", parents: "+ CE.parents.join(", "), CE.parents, p.attributes);
    return p;
  };

  ce.eachChildren = function(cb) {
    // console.info('CE.eachChildren', this, cb);
    this.children.each(cb);
    return this.children.toArray();
  };

  ce.eachChildrenObject = function(cb) {
    var children = {};
    this.children.each(function(model) {
      if (_.isFunction(cb)) cb(model);
      children[model.id] = model;
    });
    return children;
  };
  
  cc.url = function() {
    return this.model.id;
  };
  cc.comparator = function(CE) {
    return CE.get('weight') || CE.title();
  };
  cc.model = ce;
  cc.initialize = function(models, options) {
    this.Kern = K;
  };

  cp.model = ce;
  cp.initialize = function(models, options) {
    this.Kern = K;
  };

  kern.contentEntry = ce;
  kern.contentChildren = cc;
  kern.contentParents = cp;

  // http://lostechies.com/derickbailey/2011/08/03/stop-using-backbone-as-if-it-were-a-stateless-web-server/
  kern.View = {
    /*
     * el: "#some-model", template: "#some-template",
     * 
     * events: { "click a.delete": "delete" },
     */
    render : function() {
      var html = $(this.template).tmpl(this.model);
      $(this.el).html(html);
    },

    'delete' : function(e) {
      e.preventDefault();
      this.model.destroy();
      this.remove();
    }
  };

  kern.contentChildrenView = _.extend({});

  kern.contentEntryBreadcrumbView = _.extend({
    el : '#breadcrumb',
    template : '#breadcrumb-template',
  });

  function AJAXLinkApply() {
    var $el = $(this);
    var newURL = $el.attr('href');
    try {
      K.navigate('!' + newURL, true);
    } catch (e) {
      console.error(e);
    }
    return false;
  }
  ;
  kern.AJAXLinkApply = AJAXLinkApply;
  
  function AJAXLinkAttach() {
    if (onServer)
      return;

    this.Kern = K;
    var $a = $(this).addClass('ajax-processed').click(AJAXLinkApply);

    // maybe useful for later...
    var url = $a.attr('href');
    AJAXCache.elements[url] = $a;
    AJAXCache.urls[url] = $a;
  }
  ;
  kern.AJAXLinkAttach = AJAXLinkAttach;

  function assetsReload(assets, t) {
    for ( var a in assets) {
      switch (t) {
      case 'styles':
        if (assets[a].href) {
          var $link = $('link[href^="' + assets[a].href + '"]:last').attr(
              'href', null).attr('href',
              assets[a].href + '?rd=' + Math.random());
        }
        break;
      case 'scripts':
        break;
      }
    }
  }

  /**
   * Function: kern.initialize
   * 
   * On the client side, the initialization take care of the following things: -
   * Start listenning to a websocket - Attach a basic behavior to the links
   * might be used in conjuction with the hashchange event of window
   * 
   * In this case, the window object is sometimes used, it is safe because
   * there's a server side version of that method who will override this one
   * 
   * Parameters: options - A hash of options
   */
  kern.initialize = function(options) {
    K = this;

    K.bind('initialized', function() {
      console.info("***************** KERN INITIALIZED *****************");
      console.info('window.location.hash', window.location.hash);
      if (window.location.hash) {
        K.navigate(window.location.hash);
      } else if (K.settings.pageAtStart) {
        // K.bone.navigate('!'+K.settings.pageAtStart, true);
      }
    });

    K.bind('fileapplied', function() {
      console.info("***************** FILE APPLIED *****************");
      K.$('body').removeClass('applying-file');
    });

    K.$notifier = $('#notifier').notify();
    K.flash = function(flashes) {
      for ( var type in flashes) {
        for ( var f in flashes[type]) {
          K.notify(type, {
            text : flashes[type][f]
          });
        }
      }
    };

    // Attach a click event to the AJAX aware content links
    var $a = $(AJAXLinkSelector).each(AJAXLinkAttach);
    K.bind('domchange', function(context) {
      K.$(AJAXLinkSelector, context).each(AJAXLinkAttach);
    });

    var Router = Backbone.Router.extend({
      routes : {
        '!*filepath' : 'applyfile'
      },
      applyfile : function(filepath) {
        path = filepath.split('?').shift();
        console.info('Router apply file: ' + path, K.paths[path],
            window.location.hash.split('?').shift());
        K.applyFile(path);
      }
    });
    K.bone = new Router();
    _.extend(K, K.bone);

    K.fs.getFiles.call(K, function(data) {

      Backbone.history.start({
        silent : false
      });

      try {
        K.appCache = window.applicationCache || {};
        if (_.isFunction(K.appCache.addEventListener)) {
          K.appCache.addEventListener('checking', console.info, false);
          K.appCache.addEventListener('noupdate', console.info, false);
          K.appCache.addEventListener('downloading', console.info, false);
          K.appCache.addEventListener('cached', console.info, false);
          K.appCache.addEventListener('updateready', console.info, false);
          K.appCache.addEventListener('obsolete', console.info, false);
          K.appCache.addEventListener('error', console.info, false);
        }
      } catch (e) {
        console.error(e);
      }

      K.trigger('initialized');
      console.groupEnd();
    });
  };

  kern.notify = function(tmpl, vars, opt) {
    K = K || this;
    var args = _.toArray(arguments);
    if (!_.isString(tmpl)) {
      var tmpl = 'notification';
      vars = args[0] || {};
      opt = args[1] || {};
    } else if (tmpl == 'default') {
      tmpl = 'notification';
    } else {
      tmpl = 'notification-' + tmpl;
    }
    if (!$('#' + tmpl, K.$notifier).length)
      tmpl = 'notification';
    K.$notifier.notify('create', tmpl, vars, _.extend({
      custom : true
    }, opt));
  };

  function parentDirectory(file, paths) {
    var url = (typeof file == 'string' ? file : file.url);
    var parts = url.split('/');
    var parent = {};
    try {
      if (parts.pop() == 'index.html')
        parts.pop();
      parent = paths[parts.join('/')] || paths['/'];
    } catch (e) {
      throw new Error('Can not find the parent directory for ' + file.url + ' '
          + url.join('/') + ' in ' + _.keys(paths || {}).join(', '));
    }
    return parent;
  }

  // ce.image = 
  ce.cover = function(prefix, toFormat) {
    var CE = this,
        isImage = /image\//.test(this.get('mime'))
    ;
    if (/^text\//.test(this.get('mime'))) {
      CE.image = false;
      return CE.image;
    }

    prefix = prefix || '/' + (isImage ? 'i' : 'av') + '/thumb';
    toFormat = toFormat || '';

    if (isImage)
      return prefix + CE.id + toFormat;
    
    if (CE.isDir()) {
      var child = _.find(function(c){
        return !_.isUndefined(c.image) && /^image\//.test(c.get('mime'));
      });
      if (child)
        return child.cover(prefix, toFormat);
    }
    return false;
  };


  kern.renderEntryChildren = function(options) {
    K = K || options.Kern;
    var out = [], gallery = [], content = '', thumbPrefix = '/i/thumb';

    options.file.children.each(function(model, m) {
      // if (!/^cover\.(jpg|png|gif)/i.test(model.basename())) {
      if (!model.has('hidden') || !model.get('hidden')) {
        var coverArt = model.image || model.cover(),
            mimeClass = model.get('mime') ? model .get('mime').split(/[^a-z0-9-]/ig).join('-') : 'directory'
        ;

        if (!coverArt)
          mimeClass += ' no-art';

        var compiled = _.template(K.getTemplate('contententry'), {
          url : model.id,
          cssClass : mimeClass,
          children : (model.children.length ? '<span class="count">'
              + model.children.length + '</span>' : '')
              + (model.meta ? '<span class="meta">has metadata</span>' : ''),
          title : model.title(),// || model.basename(),
          cover : (coverArt ? ' background-image:url(' + encodeURI(coverArt)
              + ');' : '')
        });
        out.push(compiled);

      }
    });

    if (!out.length && !gallery.length) {
      content = (options.file.title() || options.file.basename())
          + ' is an empty directory';
    }
    if (out.length) {
      out.unshift('<ul class="directory children">');
      out.push('</ul>');
      content = out.join("\n");
    }
    if (gallery.length) {
      content = content + '<ul class="gallery">' + gallery.join("\n") + '</ul>';
    }

    if (options.$el) {
      options.$el.html(content);
      // Attach a click event to the AJAX aware content links
      $(AJAXLinkSelector, options.$el).each(AJAXLinkAttach);
      return null;
    }
    return content;
  };

  kern.errorEntry = function(err) {
    var K = this;
    var error = {
      name : err.code,
      error : err,
      noMenu : true,
      hidden : true,
      title : err.code + ' ' + err.name,
      children : [],
      regions : {
        main : '<div class="description">' + err.description + '</div>'
            + '<pre class="error stack">' + err.stack + '</pre>'
      }
    };
    return new K.models.ContentEntry(error, {
      isRoot : false,
      Kern : K
    });
  };

  kern.findIndex = function(file) {
    K = K || this;
    if (!_.isUndefined(K.paths[file.id + '/index.html']))
      file = K.paths[file.id + '/index.html'];
    if (!_.isUndefined(K.paths[file.id + 'index.html']))
      file = K.paths[file.id + 'index.html'];
    return file;
  };

  /**
   * Function kern.applyFile Apply the information about a file into the page
   */
  kern.applyFile = function(fileURL) {
    K = K || this;
    
    if ($('body.applying-file').length) {
      console.error('Already applying');
      return;
    }
    $('body').addClass('applying-file');
    var file = (
      !fileURL || fileURL == '' || fileURL == '/'
    ) ? K.struct : (_.isString(fileURL) ? K.paths[fileURL.split('?').shift()] : false);
    if (!file || !_.isFunction(file.get)) {
      console.error('applyFile not found file ', fileURL.split('?').shift());
      file = K.errorEntry(new K.errors.NotFound(fileURL + ' can not be found'));
    }

    // look for an index
    file = !file.has('error') ? K.findIndex(file) : file;

    var options = {
      file : file,
      root : file.id,
      files : K.struct.toJSON(),
      Kern : K
    };

    if (!file.has('error')) {
      if (!onServer && file.children.length && !file.get('regions')) {
        file.set({
          regions : {
            main : // 'common kern applyFile =&gt; renderEntryChildren'+
            K.renderEntryChildren(options)
          }
        }, {
          silent : true
        });
      }
      console.info('K.currentFile.id, file.id', K.currentFile ? K.currentFile.id : '/', file.id, K.currentFile ? K.currentFile.id : '/' == file.id);
      if (_.isUndefined(K.currentFile) || K.currentFile.id != file.id) {
        K.currentFile = file;
        console.info('File to be applied '+ file.id);
        K.apply(K.currentFile);
      }
      else {
        var parts = location.hash.split('?');
        K.trigger('querychange', parts.length == 2 ? parts.pop() : {});
      }
    }
    else {
      console.error('Error to be applied '+ file.get('regions').main);
      K.apply(file);
    }
    $('body').removeClass('applying-file');
  };

  /**
   * Function: kern.apply Parameters: file - a hash object containing
   * information about a file
   */
  kern.apply = function(file) {
    var K = this;
    $ = $ || K.$;
    K.$ = $;

    var errors = {};
    
    var data = _.clone(typeof file.toJSON == 'function' ? file.toJSON() : file);
    data.url = data.id;
    
    if (!onServer) console.info('file children json', file.children.toJSON(), 'data.mime', data.mime);
    if (!file.error && _.isUndefined(file.mime) && (!file.children || !file.children.length)) {
      if (!onServer) {
        console.info('Trying to apply empty directory:', file);
        file.load();
        $('body').removeClass('applying-file');
        return;
      }
    }



    for (var selector in K.rules) {
      if (onServer) {
        try {
          K.rules[selector].call($(selector), data, true, K);
        } catch (e) {
          K.log('error', 'applying', e);
        }
      }
      else {
        K.rules[selector].call($(selector), data, true, K);
      }
    }
    
    if (_.toArray(errors).length)
      console.error("The following errors occured while applying the rules.",
          errors);
    $('body').removeClass('applying-file');
    K.trigger('fileapplied', file, K.currentFile && K.currentFile.id == file.id);
  };

  /**
   * Function: analyse Process analysis rules on a string Parameters: str - A
   * string to analyse
   * 
   * Returns: obj A hash of information about the given string
   * 
   * See <rules>
   */
  kern.analyse = function(str, options) {
    var parsed = {}, K = this;
    var $f = $('<div>' + str + '</div>');
    K.log('debug', 'analysis', "Available selectors "+ _.keys(K.rules).join("\n"));
    for ( var selector in K.rules) {
      K.log('debug', 'analysis', 'Looking for selector: '+ selector, $(selector, $f).length);
      K.rules[selector].call($(selector, $f), parsed, false, K);
    }
    return parsed;
  };

  // var contentRule = function(options) {
  //   if (!options.selector || !options.context || !options.target)
  //     throw new Error('Missing settings for the contentRule');
  //   _.extend(this.options, options);
  //   this.initialize();

  //   this.selector = options.selector;
  //   this.target = options.target;
  //   this.recontext(options.context);

  //   return this;
  // };
  // _.extend(contentRule.prototype, {
  //   options : {},
  //   $match : null,
  //   initialize : function() {
  //     return this;
  //   },
  //   recontext : function(newContext) {
  //     this.context = !_.isString(newContext) ? newContext : $('<div>'
  //         + newContext + '</div>');
  //     if (!this.context || !this.context.length)
  //       throw new Error('The context can not be used.');
  //     this.$match = $(this.selector, this.context);

  //     return this;
  //   },
  //   insert : function(cb) {

  //     if (_.isFunction(cb))
  //       cb.call(this);
  //     return this;
  //   },
  //   extract : function(cb) {

  //     if (_.isFunction(cb))
  //       cb.call(this);
  //     return this;
  //   }
  // });

  // var BodyView = Backbone.View
  //     .extend({
  //       tagName : 'div',
  //       initialize : function() {
  //         // this.template = _.template();
  //       },
  //       render : function() {

  //         var list = "<ul><% _.each(children, function(child) { console.info(child); %> <li><%= child.title || child.name %></li> <% }); %></ul>";
  //         var html = _.template(list, this.model.toJSON());

  //         $(this.el).html(html);
  //         return this;
  //       }
  //     });

  /**
   * Variable: rules Describes a set of rules to analyse a HTML structure
   * Returns: obj Every key of the object is a selector The value is a callback
   * where context ("this") is the jquery object represented by the selector The
   * first argument passed to the callback is the object containing the
   * information about the file. The second argument is true is we are rendering
   * the html and use the information gathered
   * 
   * See: - <analyse> - <apply>
   */
  kern.rules = {};








  kern.fs = typeof kern.fs == 'object' ? kern.fs : {};

  kern.fs.isDir = function(f) {
    return typeof f.children == 'object';
  };

  /**
   * 
   */
  kern.fs.isFile = function(f) {
    return _.isUndefined(f.children);
  };

  /**
   * Check if a directory has children
   */
  kern.fs.hasChildren = function(f, invisible) {
    if (!kern.fs.isDir(f))
      return false;
    for ( var c in f.children) {
      if (!kern.fs.isEmpty(f.children[c]))
        return true;
    }
    return true;
  };

  /**
   * Check if a file or directory can be considered empty
   */
  kern.fs.isEmpty = function(f, invisible) {
    if (kern.fs.isFile(f)) {
      if (typeof f.regions != 'object')
        return true;
      if (!f.regions.length)
        return true;
      for ( var r in f.regions) {
        if (f.regions[r].length)
          return false;
      }
      return true;
    }
    return kern.fs.hasChildren(f, invisible);
  };

  /**
   * Check if a file can be considered as an index
   */
  kern.fs.isIndex = function(f) {
    return kern.fs.isFile(f) && !f.hidden && f.name == 'index.html';
  };

  /**
   * Check if a directory has an index
   */
  kern.fs.hasIndex = function(f) {
    if (kern.fs.isFile(f) || !kern.fs.isDir(f))
      return false;
    return !kern.fs.isEmpty(f.children['index.html']);
  };

  /**
   * Function: fs.saveFile Saves save the file.content in the "file" parameter
   * path
   * 
   * Parameters: file - A hash of information, should at least have "content",
   * "parents" & "name" property fc - A callback
   */
  kern.fs.saveFile = function(file, fn) {
    $.ajax({
      type : 'POST',
      url : '/kern/files.js?file=/' + file.get('parents').join('/') + '/'
          + file.basename(),
      data : file,
      success : function(data) {
        if (typeof fn == 'function') {
          fn(file, data);
        }
      },
      dataType : 'json'
    });
  };

  /**
   * Function: fs.getFiles Fetches the tree structured representation of the
   * content
   * 
   * Parameters: cb - a callback
   */
  kern.fs.getFiles = function(path, cb) {
    var params = {};
    if (!_.isString(path)) {
      cb = path;
    } else {
      params.from = path;
    }
    var K = this;
    console.time('Timing AJAX');
    $.getJSON('/kern/files.js', params, function(data) {
      console.timeEnd('Timing AJAX');
      console.info('Fetched data', data);
      K.notify({
        title : 'Fetched content',
        text : ''
      });
      // K.files = data;

      // clear the paths?
      K.struct = new K.models.ContentEntry(data, {
        Kern : K
      });

      if (typeof cb == 'function')
        cb.call(K);
    });
  };

  /**
   * Function: fs.flatten Transforms a tree structured representation of content
   * into a list of URLs (paths)
   * 
   * Returns: obj A linear hash keyed by URL
   */
  kern.fs.flatten = function(struct) {
    var flat = flat || {};
    struct.parents = struct.parents || [];

    var name = struct.parents.join('/') + '/' + struct.name;
    flat[name] = struct;

    if (typeof struct.children == 'object') {
      for ( var c in struct.children) {
        _.extend(flat, kern.fs.flatten(struct.children[c]));
      }
    }

    function flatSort(obj) {
      var sorted = {};
      _.map(obj, function(info, url) {
        obj[url].url = obj[url].url || obj[url].parents.join('/') + '/'
            + obj[url].name;
      });
      _.map(_.sortBy(_.clone(obj), function(a, b) {
        a.weight = !a.weight || isNaN(a.weight) ? 0 : a.weight;
        b.weight = !b.weight || isNaN(b.weight) ? 0 : b.weight;
        return a.weight - b.weight;
      }), function(info) {
        sorted[info.url] = info;
      });
      return sorted;
    }
    ;
    var sorted = flatSort(flat);
    return flat;
  };

  /*****************************************************************************
   * *********************************************************\ Utilities \
   ****************************************************************************/

  kern.models = models;
  kern.views = views;
  _.extend(wexpows, kern);

})(typeof exports === 'undefined' ? this.KernMethods = this.KernMethods || {} : exports);
