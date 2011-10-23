/**
 * CommonJS file
 */

(function(wexpows){
  var methods = {}
    , models = {}
    , collections = {}
    , views = {}
    , onServer = typeof window === 'undefined'
    , AJAXLinkSelector = 'a[href^="/"]:not([href^="//"],.ajax-processed)'
    , _
    , K
    , socket
    , AJAXCache   = {elements:{}, urls:{}}
  ;
  
  if (onServer) {
    _           = require('underscore')._;
    $           = require('jQuery');
    Backbone    = require('backbone');
  }
  else {
    _           = window._;
    $           = window.jQuery || window.Zepto;
    Backbone    = window.Backbone;
  }
  
  
  
  methods.contentEntry = {
    initialize: function(attributes, options) {
      K = K || options.Kern;
      this.Kern = K;
      var CE = this;
      
      if (_.isUndefined(this.get('url'))) {
        this.attributes.url = (this.attributes.parents || []).join('/') + '/' + this.basename();
      }
      
      var children = this.attributes.children || [];
      children = _.isArray(children) ? children : _.toArray(children);
      this.children = new K.collections.ContentChildren(children, options);
      delete this.attributes.children;
      
      if (!_.isUndefined(CE.get('url'))) {
        K.paths[CE.get('url')] = CE;
      }
      
      //console.info("Child paths for  "+this.get('url')+"\n - "+ _.keys(this.childPaths()).join("\n - "));
    },
    
    
    // following methods are kind of subset of the "path" from nodejs
    // should work the same but take no "p" arguments
    
    dirname: function() {
      return this.parents.join('/');
    },
    basename: function(ext) {
      var name = this.get('name');
      if (!name) return '';
      return name.split(ext).join('');
    },
    extname: function() {
      var ext = this.get('name').split('.');
      return ext.length > 1 ? '.'+ ext.pop() : '';
    },
    exists: function(cb) {
      // ...
    },
    existsSync: function() {
      return true;
//      return require('path').exists(this.absPath());
    },
    
    
    
    childPaths: function(){
      var flat = {};
      this.children.each(function(child, c){
        flat[child.get('url')] = child;
        _.extend(flat, child.childPaths());
      });
      return flat;
    },
    
    isDir: function() {
      return this.children instanceof K.models.ContentChildren;
    },
    isFile: function(f) {
      return _.isUndefined(this.children);
    },
    hasChildren: function(invisible) {
      if (!this.isDir()) 
        return false;
      for (var c in this.children) {
        if (!this.children[c].isEmpty()) 
          return true;
      }
      return true;
    },
    isEmpty: function(invisible) {
      if (this.isFile()) {
        if (typeof this.regions != 'object') 
          return true;
        if (!this.regions.length) 
          return true;
        for (var r in this.regions) {
          if (this.regions[r].length) 
            return false;
        }
        return true;
      }
      return this.hasChildren(invisible);
    },
    isIndex: function() {
      return this.isFile() && !this.get('hidden') && this.basename() == 'index.html';
    },
    hasIndex: function(f) {
      if (this.isFile() || !this.isDir()) return false;
      for (var m in this.children.models) {
        var model = this.children.models[m];
        if (model.basename() == 'index.html') return true;
      }
    },
    toJSON: function() {
      return _.extend(_.clone(this.attributes), {
        children: this.children.toJSON()
      });
    },
    title: function() {
      title = this.get('title');
      if (title) return title;
      if (this.children.length) {
        for (var c in this.children.models) {
          if (this.children.models[c].basename() == 'index.html') {
            return this.children.models[c].title();
          }
        }
      }
      return this.basename();
    }
  };
  
  methods.contentChildren = {
    initialize: function(models, options) {
      this.Kern = K;
      // console.log('A contentChildren collection is initialized');
    },
  };
  
  methods.contentParents = {
    initialize: function(models, options) {
      this.Kern = K;
      // console.log('A contentChildren collection is initialized');
    },
  };
  
  
  
  // http://lostechies.com/derickbailey/2011/08/03/stop-using-backbone-as-if-it-were-a-stateless-web-server/
  methods.View = {
    /*
    el: "#some-model",
    template: "#some-template",
    
    events: {
      "click a.delete": "delete"
    },
    */
    render: function() {
      var html = $(this.template).tmpl(this.model);
      $(this.el).html(html);
    },
    
    'delete': function(e) {
      e.preventDefault();
      this.model.destroy();
      this.remove();
    }
  };
  
  methods.contentChildrenView = _.extend({
    el: '#breadcrumb',
    template: '#breadcrumb-template',
  });
  
  methods.contentEntryBreadcrumbView = _.extend({
    el: '#breadcrumb',
    template: '#breadcrumb-template',
  });
  
  
  
  
  
  
  
  
  
  
  
    
  
  function AJAXLinkApply() {
    var $el = $(this);
    var newURL = $el.attr('href');
    console.info('Link clicked '+ newURL);
    try {
      K.navigate('!'+newURL, true);
    }
    catch(e) {
      console.error(e);
      //console.info('K.navigate', K.navigate);
    }
    return false;
  };
  
  function AJAXLinkAttach() {
    if (onServer) return;
    
    this.Kern = K;
    var $a = $(this)
      .addClass('ajax-processed')
      .click(AJAXLinkApply);
    
    // maybe useful for later...
    var url = $a.attr('href');
    AJAXCache.elements[url] = $a;
    AJAXCache.urls[url] = $a;
  };
  
  
  
  function assetsReload(assets, t) {
    for (var a in assets) {
      switch (t) {
        case 'styles':
          if (assets[a].href) {
            var $link = $('link[href^="' + assets[a].href + '"]:last')
              .attr('href', null)
              .attr('href', assets[a].href+'?rd='+Math.random())
            ;
          }
          break;
        case 'scripts':
          break;
      }
    }
  }
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  /**
   * Function: methods.initialize
   * 
   * On the client side, the initialization take care of
   * the following things:
   * - Start listenning to a websocket
   * - Attach a basic behavior to the links might be used
   *   in conjuction with the hashchange event of window
   * 
   * In this case, the window object is sometimes used,
   * it is safe because there's a server side version
   * of that method who will override this one
   * 
   * Parameters: 
   *   options - A hash of options
   */
  methods.initialize = function(options) {
    var socketUrl = '//' + window.location.host;// +'/kern';
    K = this;
    K.$notifier = $('#notifier').notify();
    K.flash = function(flashes){
      for (var type in flashes) {
        for (var f in flashes[type]) {
          K.notify(type, {text: flashes[type][f]});
        }
      }
    };
    
    
    
    
    
    
    // Attach a click event to the AJAX aware content links
    var $a = $(AJAXLinkSelector).each(AJAXLinkAttach);
    console.info('AJAX links found: '+ $a.length);
    var Router = Backbone.Router.extend({
      routes: {
        '!*filepath': 'applyfile'
      },
      applyfile: function(filepath){
        console.info('Navigate to '+ filepath, K.bone, window.location.hash);
        try {
          K.applyFile(filepath);
        }
        catch (e) {
          console.error(e);
          console.error('Can not apply filepath: '+ filepath);
        }
      }
    });
    
    K.bone = new Router();
    
    _.extend(K, K.bone);
    
    
    
    if (typeof io != 'undefined') {
      socket = {};
      socket = io.connect(socketUrl);
      
      socket.on('connection', function(data) {
        console.info('Connected to Kern');
      });
            
      socket.on('newcomer', function(newcomer){
        K.notify({
          title: 'Newcomer',
          text: newcomer.id
        });
      });
      
      socket.on('sid', function(sid) {
        console.log('Received a socket id:'+ sid);
        K.socketId = sid;
      });
      
      socket.on('contentchange', function(data) {
        K.notify({
          title: 'Content changed',
          text: data.path
        });
        K.fs.getFiles.call(K, function() {
          K.applyFile(data.path);
          window.location.hash = '!'+data.path;
//          K.navigate('!'+ data.path, true);
        });
      });
      
      socket.on('assetchange', function(data) {
        for (var t in data) {
          var assets = data[t];
          console.log('Changing asset type '+ t, assets);
          assetsReload(assets, t);
          K.notify({title: 'Reloaded '+ t});
        }
      });
      
      socket.on('changelocation', function(data) {
        console.log('Location changed' + data.newURL, data);
        K.applyFile(data.newURL);
      });
      
      socket.on('logging', function(data){
        var now = new Date();
        now = now.getTime();
        console.log('Received debug info from server ('+Math.round((now - data.started))+')');
      });
      K.socket = socket;
    }
    
    
    
    
    
    
    
    
    
    
    
    
    K.fs.getFiles.call(K, function(data){
      /*
      try {
        if (!K.currentPage && K.settings.pageAtStart && K.paths[K.settings.pageAtStart]) {
          K.applyFile(K.settings.pageAtStart);
          K.navigate(K.settings.pageAtStart);
        }
      }
      catch(e){
        console.error(e);
      };
      */
      console.log('K.bone.routes', K.paths, K.bone.routes);
      console.log('Paths are loaded', K.paths);
      console.info('Starting history', K.settings.pageAtStart);
      console.info('K.settings.pageAtStart', K.settings.pageAtStart);
      Backbone.history.start({
        silent: false
//        , root: '!'+K.settings.pageAtStart
      });
    });
    
    try {
      K.appCache = window.applicationCache || {};
      if (_.isFunction(K.appCache.addEventListener)) {
        K.appCache.addEventListener('checking',console.info,false);
        K.appCache.addEventListener('noupdate',console.info,false);
        K.appCache.addEventListener('downloading',console.info,false);
        K.appCache.addEventListener('cached',console.info,false);
        K.appCache.addEventListener('updateready',console.info,false);
        K.appCache.addEventListener('obsolete',console.info,false);
        K.appCache.addEventListener('error',console.info,false);
      }
    }
    catch(e) {
      console.error(e);
    }
  };
  
  
  
  
  
  
  
  methods.notify = function(tmpl, vars, opt){
    K = K || this;
    var args = _.toArray(arguments);
    if (!_.isString(tmpl)) {
      var tmpl = 'notification';
      vars = args[0] || {};
      opt = args[1] || {};
    }
    else if (tmpl == 'default') {
      tmpl = 'notification';
    }
    else {
      tmpl = 'notification-'+ tmpl;
    }
    if (!$('#'+tmpl, K.$notifier).length) tmpl = 'notification';
    K.$notifier.notify('create', tmpl, vars, _.extend({custom: true}, opt));
  };
  
  
  function parentDirectory(file, paths) {
    var url = (typeof file == 'string' ? file : file.url);
    var parts = url.split('/');
    var parent = {};
    try {
      if (parts.pop() == 'index.html') parts.pop();
      parent = paths[parts.join('/')] || paths['/'];
    }
    catch (e) {
      throw new Error('Can not find the parent directory for '+ file.url +' '+ url.join('/') +' in '+ _.keys(paths||{}).join(', '));
    }
    return parent;
  }
  
  methods.contentEntry.cover = function() {
    var CE = this;
    for (var m in CE.children.models) {
      var model = CE.children.models[m];
      console.info("Cover?", model.get('name'), /cover\./ig.test(model.get('name')));
      if (/cover\./ig.test(model.get('name'))) return '/i/thumb'+ model.get('url');
    }
    return false;
  };
  
  methods.renderEntryChildren = function(options) {
    K = K || options.Kern;
    var out = []
      , gallery = []
      , content = ''
      , thumbPrefix = '/i/thumb';
    options.file.children.each(function(model, m) {
      //if (!model.get('hidden')) {
        var coverArt = /^image\//ig.test(model.get('mime')) ? (thumbPrefix + model.get('url')) : model.cover()
          , mimeClass = model.get('mime') ? model.get('mime').split(/[^a-z0-9-]/ig).join('-') : 'directory'
        ;
        if (!coverArt) mimeClass += ' no-art';
        out.push('<li'+ (coverArt ? ' style="background-image:url('+ encodeURI(coverArt) +');"' : '') +' class="'+ mimeClass +'">');
        out.push('<a href="'+ model.get('url') +'"><span>'+ (model.title() || model.basename()) +'</span></a>');
        out.push('</li>');
      /*
      }
      else if (!options.file.get('nogallery') && /image\//ig.test(model.get('mime'))) {
        gallery.push('<li style="background-image:url('+ encodeURI(thumbPrefix + model.get('url')) +');" class="'+ mimeClass +'">');
        gallery.push('<a href="'+ model.get('url') +'">');
        gallery.push('<span>'+ (model.title() || model.basename()) +'</span>');
//        gallery.push('<img src="'+ thumbPrefix + model.get('url') +'" />');
        gallery.push('</a></li>');
      }
      */
    });
    
    if (!out.length && !gallery.length) {
      content = (options.file.title() || options.file.basename()) +' is an empty directory';
    }
    if (out.length) {
      out.unshift('<ul class="directory children">');
      out.push('</ul>');
      content = out.join("\n");
    }
    if (gallery.length) {
      content = content + '<ul class="gallery">'+ gallery.join("\n") +'</ul>';
    }
    
    if (options.$el) {
      options.$el.html(content);
      // Attach a click event to the AJAX aware content links
      $(AJAXLinkSelector, options.$el).each(AJAXLinkAttach);
      return null;
    }
    return content;
  };

  /**
   * Renders a menu tree
   * @todo make this "Common"
   * @param {Object} options
   */
  methods.renderTabs = function(options) {
    K = K || options.Kern;
    function tabs(file) {
      return '@todo methods.renderTabs()';
    };
    
    if (options.$el) {
      options.$el.html('<!-- tabs -->'+ tabs(options.files));
      // Attach a click event to the AJAX aware content links
      $(AJAXLinkSelector, options.$el).each(AJAXLinkAttach);
      return null;
    }
    return tabs(options.files || {parents:['']});
  };
  
  
  
  /**
   * Renders a navigation (first level of the menu)
   * @todo make this "Common"
   * @param {Object} options
   */
  methods.renderNavigation = function(options) {
    K = K || options.Kern;
    function menu(file) {
      return '';// '@todo methods.renderNavigation()';
    };
    
    var sub = parentDirectory(options.root, K.paths);
    if (options.$el) {
      options.$el.html('<!-- navigation -->'+ menu(sub));
      // Attach a click event to the AJAX aware content links
      $(AJAXLinkSelector, options.$el).each(AJAXLinkAttach);
      return null;
    }
    return menu(sub || {parents:['']});
  };
  
  
  
  
  methods.renderBreadcrumb = function(options) {
    K = K || options.Kern;
    
    function breadcrumb() {
      var out = [];
      if (_.isUndefined(K.paths[options.current])) return;
      
      var parents = _.clone(K.paths[options.current].get('parents'));
      for (var p in parents) {
        var url = parents.slice(0, p).join('/')+'/'+parents[p];
        var file = K.paths[url];
//        console.info('breadcrumb entry - '+p+' '+parents[p]);
        if (file && _.isFunction(file.get)) {
          var sub = [];
          var title = file.title();
          var url = file.get('url');
          
          if (file.children.length) {
            file.children.each(function(child, num){
              if (_.isFunction(child.get)) {
                if (child.basename() == 'index.html') {
                  title = child.title();
                  url = child.get('url');
                  console.info("Index found", url);
                }
                else {
                  sub.push('<a href="'+ child.get('url') +'">'+ (child.title() || child.basename()) +'</a>');
                }
              }
            });
          }
          
          out.push('<span class="entry">'
            + '<a href="'+ url +'">'+ title +'</a>'
            + (sub.length ? '<span class="children">'+sub.join("\n")+'</span>' : '')
            + '</span>');
        }
      }
      
      return out.join(' <span class="separator">&raquo;</span> '); 
    }
    
    if (options.$el) {
      //console.info('options.$el.length', options.$el.length);
      options.$el.html('<span>'+breadcrumb()+'</span>');
      // Attach a click event to the AJAX aware content links
      K.$(AJAXLinkSelector, options.$el).each(AJAXLinkAttach);
      return null;
    }
    
    return breadcrumb();
  };
  
  
  methods.applyError = function(code, msg) {
    var error = {
      url: code,
      title: 'Error '+ code,
      regions: {
        main: "Dude.. you're fç%&*d...<br/>"+msg
      }
    };
    return new K.models.ContentEntry(error, {isRoot: false, Kern: this});
  };
  
  
  methods.findIndex = function(file) {
    K = K || this;
    if (!_.isUndefined(K.paths[file.get('url')+'/index.html'])) file = K.paths[file.get('url')+'/index.html'];
    if (!_.isUndefined(K.paths[file.get('url')+'index.html'])) file = K.paths[file.get('url')+'index.html'];
    return file;
  };
  
  /**
   * Function methods.applyFile
   * Apply the information about a file into the page
   */
  methods.applyFile = function(fileURL) {
    K = K || this;
    if (!onServer) {
      try {
        if ($('body.applying-file').length) return;
        $('body').addClass('applying-file');
      } catch (e) {
        console.error(e);
        console.trace();
      }
    }
    //console.info('Apply '+ fileURL);
    //console.trace();
    
    file = _.isString(fileURL) ? K.paths[fileURL] : false;
    if (!file || !_.isFunction(file.get)) file = K.applyError(404, fileURL);
    file = K.findIndex(file);
    
    var options = {
      file: file,
      root: file.get('url'),
      files: K.struct.toJSON(),
      Kern: K
    };
    
    if (file.children.length && !file.get('regions')) {
      file.set({
        regions: {
          main: K.renderEntryChildren(options)
        }
      }, {silent: true});
    }
    
    console.info('File to be applied ', file, K.bone, window.location.hash, K.currentFile && (K.currentFile.get('url') == file.get('url')));
    K.currentFile = file;
    K.apply(file);
    
    methods.renderBreadcrumb(_.extend({}, options, {
      current: options.root,
      $el: $('#breadcrumb')
    }));
    
  };
  
  
  
  /**
   * Function: methods.apply
   * Parameters:
   *   file - a hash object containing information about a file
   */
  methods.apply = function(file){
    $ = $ || this.$;
    this.$ = $;
    
    for (var selector in methods.rules) {
      try {
        methods.rules[selector].call($(selector), typeof file.toJSON == 'function' ? file.toJSON() : file, true);
      }
      catch (e) {
        console.error('Applying '+selector+' failed');
        console.error(e);
      }
    }
    
    if (!onServer) {
      $('.kern-fileinfo').remove();
      $('body.applying-file').removeClass('applying-file');
      $('html').css('height', 'auto');
      $(window).trigger('resize');
    }
    
  };
  
  

  /**
   * Function: analyse
   * Process analysis rules on a string
   * Parameters: 
   *   str - A string to analyse
   *   
   * Returns: obj
   *  A hash of information about the given string
   *  
   * See <rules>
   */
  methods.analyse = function(str, options) {
    var parsed = {}
      , K = this
    ;
    var $f = $('<div>' + str + '</div>');
    for (var selector in methods.rules) {
      /*
      $(selector, $f).each(function(){
        this.Kern = K;
      });
      */
      //console.info('Looking for selector: '+ selector);
      methods.rules[selector].call($(selector, $f), parsed);//, options || {});
    }
    return parsed;
  };
  
  
  var contentRule = function(options){
    if (!options.selector || !options.context || !options.target) throw new Error('Missing settings for the contentRule');
    _.extend(this.options, options);
    this.initialize();
    
    this.selector = options.selector;
    this.target = options.target;
    this.recontext(options.context);
    
    return this;
  };
  _.extend(contentRule.prototype, {
    options: {},
    $match: null,
    initialize: function() {
      return this;
    },
    recontext: function(newContext) {
      this.context = !_.isString(newContext) ? newContext : $('<div>'+ newContext +'</div>');
      if (!this.context || !this.context.length) throw new Error('The context can not be used.');
      this.$match = $(this.selector, this.context);
      
      return this;
    },
    insert: function(cb) {
      
      if (_.isFunction(cb)) cb.call(this);
      return this;
    },
    extract: function(cb) {
      
      if (_.isFunction(cb)) cb.call(this);
      return this;
    }
  });
  
  /**
   * Variable: rules
   * Describes a set of rules to analyse a HTML structure
   * Returns: obj
   *  Every key of the object is a selector
   *  The value is a callback where context ("this")
   *  is the jquery object represented by the selector
   *  The first argument passed to the callback is the object containing the
   *  information about the file.
   *  The second argument is true is we are rendering the html
   *  and use the information gathered
   * 
   * See:
   *   - <analyse>
   *   - <apply>
   */
  methods.rules = {
    
    /**
     * 
     */
    '[src]:not(base),[href]:not(base)': function(analysed, place) {
      analysed.refs = analysed.refs || {};
      var exp = /^(http|\/)/ig;
      if (!place) {
//        console.info('************ so far, analysed: ', analysed);
        this.each(function(){
          var attr = $(this).attr('src') ? 'src' : 'href';
          var val = $(this).attr(attr);
          if (!exp.test(val)) {
            //console.info('-------------------- '+ val);
            analysed.refs[attr] = analysed.refs[attr] || [];
            analysed.refs[attr].push($(this).attr(attr));
          }
        });
      }
      else if (this.length) {
        $.each(analysed.refs, function(attrs, attr){
          for (var i in attrs) {
            $('['+attr+'="'+attrs[i]+'"]', this).attr(attr, attrs[i]);
          }
        })
      }
//      console.info((place ? 'Applyed' : 'Found') +' '+ _.keys(analysed.refs).length +' references');//, analysed.refs);
    },
    
    
    /**
     * 
     */
    'video': function(analysed, place) {
      analysed.medias = analysed.medias || {};
      analysed.medias.videos = analysed.medias.videos || {};
      var vids = analysed.medias.videos;
      if (!place) {
        this.each(function(){
          
        });
      }
      else if (this.length) {
        $.each(vids, function(ref){
          var attr = ref.split('::').shift();
          var val = ref.split('::').pop();
          $('['+attr+'="'+val+'"]', this).attr(attr, val);
        })
      }
      //console.info((place ? 'Applyed' : 'Found')+ ' videos '+ _.keys(vids).length +' references');
    },
    
    /**
     * 
     */
    '[role=static-dev-scripts]': function(analysed, place) {
      this.remove();
    },
    
    
    /**
     * 
     */
    '[role=document-title], .page-title, title': function(analysed, place) {
      if (!place) {
        analysed.title = this.last().text();
      }
      else if (this.length) {
        this.text(analysed.title);
      }
    },
    
    
    /**
     * 
     */
    '[role=document-body]': function(analysed, place) {
      analysed.regions = analysed.regions || {};
      if (!place) {
        analysed.regions.main = this.last().html();
      }
      else if (this.length) {
        if (onServer) {
          this.last().html(analysed.regions.main);
          $(AJAXLinkSelector, this).each(AJAXLinkAttach);
        }
        else {
          /*
          var oldEl = this.last()
            , newEl = oldEl.clone()
          ;
          oldEl
            .after(newEl.hide().html(analysed.regions.main))
            .slideUp()
          ;
          newEl.slideDown(function(){
            oldEl.remove();
            $(AJAXLinkSelector, newEl).each(AJAXLinkAttach);
          });
          */
          $(AJAXLinkSelector, this.html(analysed.regions.main)).each(AJAXLinkAttach);
        }
      }
      else {
        console.error('No [role=document-body]');
      }
    },
    
    
    /**
     * 
     */
    '[role=document-aside]': function(analysed, place) {
      analysed.regions = analysed.regions || {};
      if (!place) {
        analysed.regions.aside = this.html();
      }
      else if (this.length) {
        this.html(analysed.regions.aside);
        $(AJAXLinkSelector, this).each(AJAXLinkAttach);
      }
    },
    
    
    /**
     * 
     */
    'meta[property^="og:"]': function(analysed, place) {
      analysed.og = analysed.og || {};
      if (!place) {
        this.each(function(){
          var prop = $(this).attr('property').split('og:');
          analysed.og[prop] = $(this).attr('content');
        });
      }
      else {
        this.remove();
        $.each(analysed.og || {}, function(prop, content){
          $('head link, head script').first().before('<meta property="og:'+prop+'" content="'+content+'" />');
        });
      }
    },
    
    
    /**
     * 
     */
    'script': function(analysed, place) {
      if (!onServer) return;
      analysed.scripts = analysed.scripts || {};
      if (!place) {
        this.each(function(){
          var $s = $(this)
            , script = {
                content: $s.html(),
                type: $s.attr('type'),
                src: $s.attr('src'),
              }
            , name = (script.src ? script.src : 'inline'+ analysed.scripts.length)
          ;
          
          analysed.scripts[name] = script;
        });
      }
      else {
      }
    },
    
    
    /**
     * 
     */
    'style, link[rel="stylesheet"]': function(analysed, place) {
      if (!onServer) return;
      analysed.styles = analysed.styles || {};
      if (!place) {
        this.each(function(){
          var $s = $(this)
            , style = {
                content: $s.html(),
                type: $s.attr('type'),
                href: $s.attr('href'),
              }
            , name = (style.href ? style.href : 'inline'+ analysed.styles.length)
          ;
          analysed.styles[name] = style;
        });
      }
      else {
        var styles = ['<!-- new style -->'];
        
        _.each(analysed.styles || {}, function(style, name){
          styles.push(
            style.href
              ? '<link type="'+style.type+'" href="'+style.href+'" rel="stylesheet" />'
              : '<style type="'+style.type+'">'+style.content+'</style>'
            );
        });
        
        $('head').append(styles.join("\n"));
      }
    },
    
    /**
     * 
     */
    '[type="kern/lib"]': function(analysed, place) {
      if (this.length) console.info('Searching for library dependencies');
      analysed.libs = analysed.libs || {};
      if (!place) {
        //console.info('Analysed libs before ', analysed.libs);
        this.each(function(){
          var $l = $(this)
            , lib = {
                id: $l.attr('id'),
                serverScript: $l.attr('rel') == 'serverscript'
              }
          ;
          if (!lib.id) {
            return;
          }
          if (_.isUndefined(analysed.libs[lib.id])) {
            analysed.libs[lib.id] = lib;
          }
        });
        
        if (_.keys(analysed.libs).length) {
          console.info("Found the following libraries dependencies", analysed.libs);
        }
      }
      else {
        // do something
      }
    },
    
    /**
     * 
     */
    '#meta': function(analysed, place) {
      if (!place) return;
      var info = [];
      info.push(analysed.mime || 'directory');
      this.html(info.join("\n"));
    },
    
    /**
     * 
     */
    '.kern-remove': function(analysed) { this.remove(); }
  };
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  methods.fs = typeof methods.fs == 'object' ? methods.fs : {};
  
  
  
  
  
  
  
  methods.fs.isDir = function(f){
    return typeof f.children == 'object';
  };
  
  /**
   * 
   */
  methods.fs.isFile = function(f){
    return _.isUndefined(f.children);
  };
  
  /**
   * Check if a directory has children
   */
  methods.fs.hasChildren = function(f, invisible) {
    if (!methods.fs.isDir(f)) return false;
    for (var c in f.children) {
      if (!methods.fs.isEmpty(f.children[c])) return true;
    }
    return true;
  };
  
  /**
   * Check if a file or directory can be considered empty
   */
  methods.fs.isEmpty = function(f, invisible) {
    if (methods.fs.isFile(f)) {
      if (typeof f.regions != 'object') return true;
      if (!f.regions.length) return true;
      for (var r in f.regions) {
        if (f.regions[r].length) return false;
      }
      return true;
    }
    return methods.fs.hasChildren(f, invisible);
  };
  
  /**
   * Check if a file can be considered as an index
   */
  methods.fs.isIndex = function(f) {
    return methods.fs.isFile(f) && !f.hidden && f.name == 'index.html';
  };
  
  /**
   * Check if a directory has an index
   */
  methods.fs.hasIndex = function(f) {
    if (methods.fs.isFile(f) || !methods.fs.isDir(f)) return false;
    return !methods.fs.isEmpty(f.children['index.html']);
  };
  
  
  
  
  
  /** 
   *  Function: fs.saveFile
   *  Saves save the file.content in the "file" parameter path
   *  
   *  Parameters:
   *    file - A hash of information, should at least have "content", "parents" & "name" property
   *    fc  - A callback
   */
  methods.fs.saveFile = function(file, fn) {
    $.ajax({
      type: 'POST',
      url: '/kern/files.js?file=/'+ file.get('parents').join('/') + '/'+ file.basename(),
      data: file,
      success: function(data){
        if (typeof fn == 'function') {
          fn(file, data);
        }
      },
      dataType: 'json'
    });
  };
  
  
  /**
   *  Function: fs.getFiles
   *  Fetches the tree structured representation of the content
   *  
   *  Parameters:
   *    cb - a callback
   */
  methods.fs.getFiles = function(path, cb) {
    var params = {};
    if (!_.isString(path)) {
      cb = path;
    }
    else {
      params.from = path;
    }
    var K = this;
    console.time('Timing AJAX');
    $.getJSON('/kern/files.js', params, function(data){
      console.timeEnd('Timing AJAX');
      console.info('Fetched data', data);
      K.notify({title: 'Fetched content', text: ''});
      //K.files = data;

      // clear the paths?
      K.struct = new K.models.ContentEntry(data, {Kern: K});
            
      if (typeof cb == 'function') cb.call(K);
    });
  };
  
  /**
   *  Function: fs.flatten
   *  Transforms a tree structured
   *  representation of content into a list of URLs (paths)
   *  
   *  Returns:
   *    obj A linear hash keyed by URL
   */
  methods.fs.flatten = function(struct) {
    var flat = flat || {};
    struct.parents = struct.parents || [];
    
    var name = struct.parents.join('/') + '/' + struct.name;
    flat[name] = struct;
    
    if (typeof struct.children == 'object') {
      for (var c in struct.children) {
        _.extend(flat, methods.fs.flatten(struct.children[c]))
      }
    }
    
    function flatSort(obj) {
      var sorted = {};
      _.map(obj, function(info, url){
        obj[url].url = obj[url].url || obj[url].parents.join('/') + '/' + obj[url].name; 
      });
      _.map(_.sortBy(_.clone(obj), function(a, b) {
        a.weight = !a.weight || isNaN(a.weight) ? 0 : a.weight;
        b.weight = !b.weight || isNaN(b.weight) ? 0 : b.weight;
        return a.weight - b.weight;
      }), function(info){
        sorted[info.url] = info;
      });
      return sorted;
    };
    var sorted = flatSort(flat);
    return flat;
  };
  
  
  
  
  
  
  
  
  
  /***********************************************************\
   * Utilities
  \***********************************************************/
  
  
  var logger = _.extend(console || {}, {
    logging: function(){
      console.info.apply(this, arguments);
      // console.trace();
      /*
      if (this.socket) {
        this.socket.emit('logging', {
          started: this.started(),
          data: _.toArray(arguments)
        });
      }
      */
    }
  });
  /**
   * Function: methods.log
   * Client loging
   * 
   */
  methods.log = function() {
    var args = _.toArray(_.clone(arguments));
    var methodName = typeof logger[args[0]] == 'function' ? args.pop() : 'log';
    try {
      logger[methodName](args.shift(), args);
    }
    catch(e) {
      console.error(e);
      console.error('Method name given', methodName);
    }
    // would be nice to forward the logging to the socket for mobile devices debuging
  };
  
  
  
  
  
  
  
  methods.models = models;
  methods.views = views;
  _.extend(wexpows, methods);
  
})(typeof exports === 'undefined' ? this.KernMethods = this.KernMethods || {} : exports);
