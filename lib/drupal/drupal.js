(function(common){
  
  
  var onServer   = typeof exports != 'undefined',
      _          = onServer ? require('underscore')._ : window._,
      Backbone   = onServer ? require('backbone') : window.Backbone,
      $,
      defaults   = {
                      mode: 'hardcore'
                   }
  ;
  
  common.extensionName = 'KernDrupal';
  common.version = '0.0.1';
  
  common.extender = function() {
    
    var K = this
      , $ = K.$
    ;

    this.settings.drupal = _.extend({}, defaults, this.settings.drupal || (this.settings.drupal = {}));
    
    common.initialize.apply(this, arguments);
  };
  
  common.initialize = function() {
    if (!Drupal && !onServer) {
      return;
    }
    
    
    Drupal.settings.Kern = {};
    Drupal.Kern = this;
    this.Drupal = Drupal;
  };
  
  _.extend(
    common,
    onServer ? require('./drupal.server.js') : {}
  );
  
  if (console) 
  
})(typeof exports == 'undefined' ? this.KernDrupal = {} : exports);