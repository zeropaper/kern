/**
 * CommonJS file
 */

(function(wexpows){
  var methods = {}
    , models = {}
    , views = {}
    , onServer = typeof window === 'undefined'
    , AJAXLinkSelector = 'a[href^="/"]:not([href^="//"],.ajax-processed)'
    , _
    , K
    , socket
    , AJAXCache
  ;
  
  if (onServer) {
    _           = require('underscore')._;
    $           = require('jquery');
    /*
    try {
      var document = $('*:first').context._ownerDocument;
      var window = document._parentWindow;
      console.info(require.module);
      window.location.href = 'file://home/robert/Sites/kern/public/layout.html';
      var layout = require('fs').readFileSync('/home/robert/Sites/kern/public/layout.html').toString();
      layout = $(layout);
      console.info('layout.children("script").length', layout.children('script').length);
      $('head').replaceWith(layout.children('head').html());
      $('body').replaceWith(layout.children('body').html());
      console.info('Server side window location: ', window.location.href, $('*').html().length);
    } catch(e) {
      console.error(e);
    }
    */
  }
  else {
    _           = window._;
    $           = window.jQuery || window.Zepto;
    AJAXCache   = {elements:{}, urls:{}};
  }
  
  methods.contentEntry = {
    initialize: function(attributes, options) {
      this.children = new KernBone.contentChildren();
      // console.info('A contentEntry is initialized');
    },
    children: null
  };
  
  methods.contentChildren = {
    initialize: function(arguments) {
      // console.info('A contentChildren collection is initialized');
    },
  };
  
  
  // http://lostechies.com/derickbailey/2011/08/03/stop-using-backbone-as-if-it-were-a-stateless-web-server/
  methods.View = {
    el: "#some-model",
    template: "#some-template",
    
    events: {
      "click a.delete": "delete"
    },
    
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
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
    
  
  function AJAXLinkApply() {
    var $el = $(this);
    var newURL = $el.attr('href');
    K.log('A link to ' + newURL + ' has been clicked');
    /*
    try {
      K.applyFile(newURL);
      
      socket.emit('locationchange', newURL);
      window.location.hash = newURL;
    } 
    catch (e) {
      console.error(e);
      console.trace(e);
    }
    */
    K.navigate('!'+newURL, true);
    return false;
  };
  
  function AJAXLinkAttach() {
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
            var $link = $('link[href^="' + assets[a].href + '"]')
              //.attr('href', null)
              //.attr('href', assets[a].href)
              .attr('href', assets[a].href+'?rd='+Math.random())
            ;
            console.info('reload', $link);
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
    var socketUrl = '//' + window.location.host
//      , socket = io.connect(socketUrl)
//      , K = this
    ;
    K = this;
    socket = io.connect(socketUrl);
    K.log('Initializing Kern');
    
    socket.on('connection', function(data) {
      socket.emit('log', data);
    });
    
    socket.on('filechange', function(data) {
      K.log('file changed', data);
      K.fs.getFiles.call(K, function() {
        K.applyFile(data.path);
        window.location.hash = data.path;
      });
    });
    
    socket.on('assetchange', function(data) {
      K.log('asset changed', data);
      for (var t in data) {
        var assets = data[t];
        console.info('Changing asset type '+ t, assets);
        assetsReload(assets, t);
      }
    });
    
    socket.on('changelocation', function(data) {
      K.log('location changed' + data.newURL);
      K.applyFile(data.newURL);
    });
    
    
    // Attach a click event to the AJAX aware content links
    $(AJAXLinkSelector).each(AJAXLinkAttach);
    
    
    var Router = Backbone.Router.extend({
      routes: {
        '!*filepath': 'applyfile'
      },
      applyfile: function(filepath){
        console.info('Apply file '+ filepath);
        K.applyFile(filepath);
      }
    });
    
    K.bone = new Router();
    
    _.extend(K, K.bone);
    
    K.fs.getFiles.call(K, function(){
      try {
        K.routes = K.fs.flatten(K.files);
        console.info('K.bone.routes', K.routes, K.bone.routes);
        console.info('routes are loaded', K.routes);
      }
      catch (e) {
        console.error(e);
        console.trace();
      }
    });
  };
  
  
  
  
  
  function parentDirectory(file, routes) {
    var url = (typeof file == 'string' ? file : file.url);
    var parts = url.split('/');
    var parent = {};
    try {
      if (parts.pop() == 'index.html') parts.pop();
      //console.info('parent '+url+' '+ parts.join('/'));
      parent = routes[parts.join('/')] || routes['/'];
    }
    catch (e) {
      throw new Error('Can not find the parent directory for '+ file.url +' '+ url.join('/') +' in '+ _.keys(routes||{}).join(', '));
    }
    return parent;
  }
  
  
  
  
  function fileListItem(file, routes, childrenCallback) {
    if (file.hidden || !file.name) return;
    var out = [];
    var parent = parentDirectory(file, routes);
    var children = file.children || {};
    
    out.push('<li>');
    out.push('<a href="' + (children['index.html'] ? children['index.html'].url : file.url) + '">' + (file && file.title ? file.title : file.name) + '</a>');
    if (typeof file.children == 'object') {
      var m = (typeof childrenCallback == 'function' ? childrenCallback(file) : '');
      if (m) {
        out.push(m);
      }
    }
    out.push('</li>');
    
    return out.join('');
  }
  

  /**
   * Renders a menu tree
   * @todo make this "Common"
   * @param {Object} options
   */
  methods.renderTabs = function(options) {
    K = K || options.Kern;
    function tabs(file) {
      var out = ['<ul class="depth-' + file.parents.length + '">'];
      for (var f in file.children) {
        var item = fileListItem(file.children[f], K.routes);
        if (item) out.push(item);
      }
      if (out.length < 2) {
        return '';
      }
      
      out.push('</ul>');
      return out.join("\n");
    };
    
    if (options.$el) {
      //console.info('Replacing HTML in', options.$el);
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
      var out = [];

      for (var f in file.children) {
        var item = fileListItem(file.children[f], K.routes, menu);
        if (item) out.push(item);
      }
      
      if (out.length < 1) return '';
      out.unshift('<ul class="depth-' + file.parents.length + '">');
      out.push('</ul>');
      return out.join("\n");
    };
    
    var sub = parentDirectory(options.root, K.routes);
    if (options.$el) {
      //console.info('Replacing HTML in', options.$el);
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
      try {
        console.info('options.root', options.root);
        if (typeof K != 'undefined' && K.routes[options.root]) {
          var out = [];
          var parents = _.clone(K.routes[options.root].parents);
          for (var p in parents) {
            try {
              var parentURL = parents.slice(0, p).join('/') +'/'+ parents[p];
              var file = K.routes[parentURL];
              file.url = file.url ? file.url : (file.parents || ['']).join('/') + '/' + file.name;
              out.push('<a href="'+ file.url +'">'+ file.title +'</a>');
            }
            catch (e) {
              out.push('<small>'+e.message+'</small>');
            }
          }
          out.pop();
          return out.join(' <span class="separator">&raquo;</span> '); 
        }
      }
      catch(e) {
        console.error(e);
        return e.message;
      }
    }
    
    if (options.$el) {
      //console.info('Replacing HTML in', options.$el);
      options.$el.html('<!-- navigation -->'+ breadcrumb());
      // Attach a click event to the AJAX aware content links
      $(AJAXLinkSelector, options.$el).each(AJAXLinkAttach);
      return null;
    }
    return breadcrumb();
  };
  
  
  
  
  /**
   * Function methods.applyFile
   * Apply the information about a file into the page
   */
  methods.applyFile = function(fileURL) {
    if (typeof file == 'string' && window.location.hash.split('#').pop() == file) {return;}
    file = typeof fileURL == 'string' ? K.routes[fileURL] : file;
    
    K.log('applying file', fileURL);
    if (typeof file == 'object') {
      try {
        methods.apply(file);
      }
      catch (e) {
        methods.apply({
          regions:{
            main: 'Could not apply the data.<br/>'+ e.message +'<br/>file: '+ typeof file,
          },
          title: 'Error'
        });
      }
      
      try {
        methods.renderTabs({
          files: K.files,
          $el: $('header .menu')
        });
      }
      catch (e) {
        console.info(e);
      }
        
      try {
        methods.renderNavigation({
          root: fileURL,
          files: K.files,
          $el: $('#side-navigation')
        });
      }
      catch (e) {
        console.info(e);
      }
        
      try {
        methods.renderBreadcrumb({
          root: fileURL,
          files: K.files,
          $el: $('#breadcrumb')
        });
      }
      catch (e) {
        console.info(e);
      }
    }
  };
  
  
  
  /**
   * Function: methods.apply
   * Parameters:
   *   file - a hash object containing information about a file
   */
  methods.apply = function(file){
    
    if (typeof file == 'string') {
      $('body').replaceWith($(file).children('body'));
      $('head').replaceWith($(file).children('head'));
      file = arguments[1] || {};
    }
    
    var $f = $('html');
    for (var selector in methods.rules) {
      try {
        //console.info('$("'+selector+'").length', $(selector), file.regions);
        methods.rules[selector].call($(selector), file, true);
      }
      catch (e) {
        console.trace(e);
      }
    }
    
    if (!onServer) {
      $('.kern-fileinfo').remove();
      $('body').append(methods.renderfileInfo(file));
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
  methods.analyse = function(str) {
    var parsed = {};
    try {
      var $f = $('<div>' + str + '</div>');
      for (var selector in methods.rules) {
        methods.rules[selector].call($(selector, $f), parsed);
      }
    }
    catch (e) {
      parsed.title = 'Error';
      parsed.regions = {
        main: e.message
      };
    }
    return parsed;
  };
  
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
    '[role=static-dev-scripts]': function(analysed, place) {
      this.remove();
    },
    
    '[role=document-title], title': function(analysed, place) {
      if (!place) {
        analysed.title = this.last().text();
      }
      else if (this.length) {
        this.first().text(analysed.title);
//        console.info(this.last()[0].tagName);
      }
    },
    
    '[role=document-body]': function(analysed, place) {
      analysed.regions = analysed.regions || {};
      if (!place) {
        analysed.regions.main = this.last().html();
      }
      else if (this.length) {
        this.last().html(analysed.regions.main);
        $(AJAXLinkSelector, this).each(AJAXLinkAttach);
        console.info(this.last()[0].tagName);
      }
      else {
        console.error('No [role=document-body]');
      }
    },
    
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
//          console.info('Inserting openGraph meta: '+ prop +' = '+ content);
          $('head link, head script').first().before('<meta property="og:'+prop+'" content="'+content+'" />');
        });
      }
    },
    
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
//        console.info('analysed.scripts', analysed.scripts);
      }
      else {
      }
    },
    
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
//        console.info('analysed.styles', analysed.styles);
      }
      else {
      }
    }
  };
  
  
  
  
  
  
  
  
  
  
  
  
  
  methods.renderfileInfo = function(file) {
    var p = [];
    _.each({
        name :'Name'
      , title: 'Title'
      , url: 'URL'
      , regions: 'Regions'
      , weight: 'Weight'
      , depth: 'Depth'
    }, function(title, name){
      if (name == 'regions') {
        _.each(file.regions, function(content, region){
          p.push('<div class="prop '+name+'"><label>'+title+': '+region+'</label><span>'+''+'</span></div>');
        });
      }
      else {
        p.push('<div class="prop '+name+'"><label>'+title+':</label> <span>'+file[name]+'</span></div>');
      }
    });
    if (p.length < 1) return '';
    if (file.url) {
      p.push('<div class="actions"><a class="edit ui-button" href="/kern/editor?file='+file.url+'">Edit</a> <span>|</span> <a class="delete ui-button" href="/kern/delete?file='+file.url+'">Delete</a></div>');
    }
    return '<div class="kern-fileinfo">'+ p.join("\n") +'</div>';
  };
  
  
  
  
  
  methods.fs = typeof methods.fs == 'object' ? methods.fs : {};
  
  
  /** 
   *  Function: fs.saveFile
   *  Saves save the file.content in the "file" parameter path
   *  
   *  Parameters:
   *    file - A hash of information, should at least have "content", "parents" & "name" property
   *    fc  - A callback
   */
  methods.fs.saveFile = function(file, fn) {
    log('Saving file');
    $.ajax({
      type: 'POST',
      url: '/kern/files.js?file=/'+ file.parents.join('/') + '/'+ file.name,
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
  methods.fs.getFiles = function(cb) {
    var K = this;
    K.log('Loading from AJAX');
    $.getJSON('/kern/files.js', function(data){
      K.files = data;
      K.routes = K.fs.flatten(K.files);
      //log("The following content has been found:\n"+ _.keys(K.files.children).join("\n"));
      //log("The following routes were defined:\n"+ _.keys(K.routes).join("\n"));
      if (typeof cb == 'function') cb.call(K);
    });
  };
  
  /**
   *  Function: fs.flatten
   *  Transforms a tree structured
   *  representation of content into a list of URLs (routes)
   *  
   *  Returns:
   *    obj A linear hash keyed by URL
   */
  methods.fs.flatten = function(struct) {
    var flat = flat || {};
//    console.info('kern.js fs.flatten', struct);
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
    //console.info('flatSort(flat)', sorted);
    return flat;
  };
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  methods.models = models;
  methods.views = views;
  _.extend(wexpows, methods);
  
})(typeof exports === 'undefined' ? this.KernMethods = this.KernMethods || {} : exports);
