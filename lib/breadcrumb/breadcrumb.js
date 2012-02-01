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
      var current = options.file;
      var parents = current.eachParents(function(parent){
        var sub = [];
        var title = parent.title();
        var url = parent.id;
        parent.eachChildren(function(child){
          if (_.isFunction(child.get) && !child.get('hidden')) {
            if (/^index\./i.test(child.basename())) {
              title = child.get('title');
              url = child.id;
            }
            else {
              sub.push('<a href="'+ child.id +'"'+ (child.id == current.id ? ' class="active"' : '') +'>'+ (child.title() || child.basename()) +'</a>');
            }
          }
        });
        out.unshift(K.render('breadcrumb-entry', {
          url: url,
          title: title,
          sub: sub
        }));
      });

      return _.filter(out, function(s){ return s != '' && s; }).join(' <span class="separator">&raquo;</span> '); 
    }
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
      console.info('Breadcrumb, Content changed: File applied on client', file.id, K.currentPage.id);
      common.render({
        Kern: K,
        file: K.currentPage,
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
