(function(breadcrumb){
  
  var onServer   = typeof exports != 'undefined',
      common     = {},
      settings   = {},
      defaults   = {},
      _          = onServer ? require('underscore')._ : window._,
      $
  ;
  
  
  
  
  common.extensionName = 'breadcrumb';
  

  common.render = function(options) {
    var K = options.Kern;
    
    function breadcrumb() {
      var out = [];
      
      
      if (!options.file || !_.isFunction(options.file.get)) return 'Can not build breadcrumb from "'+ current +'"';
      var isRoot = _.isUndefined(options.file.id);
      var current = options.file || (isRoot ? '' : options.file.id);
      

      var parents = _.clone(options.file.parents);
      console.info('breadcrumb parents', parents);
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
      
      return _.filter(out, function(i){ return i != '' && i; }).join(' <span class="separator">&raquo;</span> '); 
    }
console.info('Rendering breadcrumb', K.$('#breadcrumb').length);
    K.$('#breadcrumb').html('<span>'+breadcrumb()+'</span>');
    if (!onServer)
      K.trigger('domchange', K.$('#breadcrumb')[0]);    
  };
  
  
  
  
  /**
   * Implements expender hook
   */
  common.extender = function() {
    // this function is overridden on server side, its safe to use the window
    var K = this;
    $ = K.$;
    console.info('Extending kern with breadcrumb');
    K.bind('breadcrumb:initialized', function(){
    });
    
    _.extend(settings, K.settings.breadcrumb || (K.settings.breadcrumb = {}));

    K.bind('breadcrumb:loaded', function(){
      common.initialize.call(K);
    });
    
    K.bind('fileapplied', function(file){
      console.info('File applied: File applied on client', file.id);
      common.render({
        Kern: K,
        file: file,
        files: K.files
      });
    });
    
    K.bind('contentchange', function(file){
      console.info('Breadcrumb, Content changed: File applied on client', file.id, K.currentFile.id);
      common.render({
        Kern: K,
        file: K.currentFile,
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
  };
  
  
  
  _.extend(
    breadcrumb,
    common, 
    onServer ? require('./breadcrumb.server.js') : {}
  );
})(typeof exports == 'undefined' ? this.breadcrumb = {} : exports);
