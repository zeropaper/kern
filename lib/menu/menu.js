(function(menu){
  
  var onServer   = typeof exports != 'undefined',
      common     = {},
      settings   = {},
      defaults   = {},
      _          = onServer ? require('underscore')._ : window._,
      $
      counter    = 0
  ;
  
  
  
  
  common.extensionName = 'menu';
  

  common.render = function(options) {
    var K = K || options.Kern;
    var $nav = K.$('[role=page-navigation]');
    if (!$nav.length) return;
    var listItems = [];
    K.struct.children.each(function(child){
      var options = _.extend({K: K, _:_}, child.toJSON());
      options.title = options.title || options.name;
      listItems.push(_.template(K.getTemplate('menu-entry'), options));
    });
    $nav.html('<ul>'+listItems.join('')+'</ul>');
    if (!onServer)
      K.trigger('domchange', $('#page-navigation')[0]);    
  };
  
  
  
  
  /**
   * Implements expender hook
   */
  common.extender = function() {
    // this function is overridden on server side, its safe to use the window
    var K = this;
    $ = K.$;
    
    _.extend(settings, K.settings.menu || (K.settings.menu = {}));

    K.bind('menu:loaded', function(){
      common.initialize.call(K);
    });
    
    K.bind('fileapplied', function(file){
      common.render({
        Kern: K
      });
    });
    
    K.bind('contentchange', function(file){
      common.render({
        Kern: K
      });
    });
  };
  
  
  /**
   * Implements initialize hook
   */
  common.initialize = function() {
    var K = this;
    console.info(' Menu --- is initializing Kern', onServer);
    
    K.trigger('menu:initialized');

    counter++;
  };
  
  
  
  _.extend(
    menu,
    common, 
    onServer ? require('./menu.server.js') : {}
  );
})(typeof exports == 'undefined' ? this.menu = {} : exports);
