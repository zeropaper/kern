(function(){

var onServer    = typeof window == 'undefined';
var Backbone    = onServer ? require('backbone') : window.Backbone;
var _           = onServer ? require('underscore')._ : window._;
var $           = onServer ? require('jQuery') : (window.jQuery || window.Zepto);
var content     = {};
var Content;

exports.extensionName = 'KernContent';

Content.extender = function() {
  var K = this;
  K.bind('extended', function(){
    Content
  });
};

onServer ? module.exports = Content : window.KernContent = Content;

})();