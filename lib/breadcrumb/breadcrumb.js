(function(breadcrumb){
  
  var onServer   = typeof exports != 'undefined',
      common     = {},
      settings   = {},
      defaults   = {},
      _          = onServer ? require('underscore')._ : window._,
      $
      counter    = 0
  ;
  
  
  
  
  common.extensionName = 'breadcrumb';
  

  common.render = function(options) {
    var K = K || options.Kern;
    
    function breadcrumb() {
      var out = [];
      
      
      var isRoot = _.isUndefined(options.file.id);
      var current = options.current || (isRoot ? '' : options.file.id);
      if (!options.file || !_.isFunction(options.file.get)) return 'Can not build breadcrumb from "'+ current +'"';
      
      /*
      out.push(_.template(K.getTemplate('breadcrumb-entry'), {
        url: '/',
        title: 'Home',
        sub: sub
      }));
      */
      out.push('<span class="entry">'
          + '<a href="/">Home</a>'
          + '</span>');

      var parents = _.clone(options.file.get('parents'));
      for (var p in parents) {
        var url = parents.slice(0, p).join('/')+'/'+parents[p];
        console.info('Drawing parent '+ p, parents.slice(0, p), url);
        var file = K.paths[url];
//        console.info('breadcrumb entry - '+p+' '+parents[p]);
        if (file && _.isFunction(file.get)) {
          var sub = [];
          var title = file.title();
          var url = file.id;
          
          if (file.children.length) {
            file.children.each(function(child, num){
              if (child.get('noMenu')) return;
              if (_.isFunction(child.get)) {
                if (child.basename() == 'index.html') {
                  title = child.title();
                  url = child.id;
                  console.info("Index found", url);
                }
                else {
                  sub.push('<a href="'+ child.id +'">'+ (child.title() || child.basename()) +'</a>');
                }
              }
            });
          }
          out.push('<span class="entry">'
              + '<a href="'+ url +'">'+ title +'</a>'
              + (sub.length ? '<span class="children">'+sub.join("\n")+'</span>' : '')
              + '</span>');
          /*
          */
          out.push(_.template(K.getTemplate('breadcrumb-entry'), {
            url: url,
            title: title,
            sub: sub
          }));
        }
      }
      
      return out.join(' <span class="separator">&raquo;</span> '); 
    }

    K.$('#breadcrumb').html('<span>'+breadcrumb()+'</span>');
    if (!onServer)
      K.trigger('domchange', $('#breadcrumb')[0]);    
  };
  
  
  
  
  /**
   * Implements expender hook
   */
  common.extender = function() {
    // this function is overridden on server side, its safe to use the window
    var K = this;
    $ = K.$;
    console.info(' Breadcrumb --- ---- Breadcrumb ----- is extending Kern');
    
    K.bind('breadcrumb:initialized', function(){
      console.info(' Breadcrumb --- The breadcrumb module has been initialized, client side');
      console.info(' Breadcrumb --- $ is '+ typeof $);
    });
    
    _.extend(settings, K.settings.breadcrumb || (K.settings.breadcrumb = {}));

    K.bind('breadcrumb:loaded', function(){
      common.initialize.call(K);
    });
    
    K.bind('fileapplied', function(file){
      console.info('File applied on server');
      common.render({
        Kern: K,
        file: file,
        files: K.files
      });
    });
  };
  
  
  /**
   * Implements initialize hook
   */
  common.initialize = function() {
    var K = this;
    console.info(' Breadcrumb --- is initializing Kern', onServer);
    
    K.trigger('breadcrumb:initialized');

    counter++;
    $('[role=page-navigation]').text('Breadcrumb comes here '+ counter);
    
  };
  
  
  
  _.extend(
    breadcrumb,
    common, 
    onServer ? require('./breadcrumb.server.js') : {}
  );
})(typeof exports == 'undefined' ? this.breadcrumb = {} : exports);
