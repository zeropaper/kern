(function(wexpows){
  var onServer = typeof exports !== 'undefined'
    , KernMethods
    , _
    , $
  ;
  
  if (onServer) {
    KernMethods    = require('./../methods');
    $              = require('jQuery');
    _              = require('underscore')._;
  }
  else {
    KernMethods    = window.KernMethods;
    $              = window.jQuery || window.Zepto;
    _              = window._;
  }
  
  
  wexpows.extender = function() {
    K.log('debug', 'watcher', 'Extending Kern, client side');
  };
})(typeof exports === 'undefined' ? this.watcher = {} : exports);