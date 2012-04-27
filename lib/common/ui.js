/**
 * CommonJS file
 */

(function(wexpows){
  var ui = {}
    , onServer = typeof window === 'undefined'
    , _
    , K
    , socket
    , AJAXCache   = {elements:{}, urls:{}}
  ;
  
  
  if (onServer) {
    _           = require('underscore')._;
    $           = require('jQuery');
    Backbone    = require('jQuery');
    KernMethods = require('ui');
  }
  else {
    _           = window._;
    $           = window.jQuery || window.Zepto;
    Backbone    = window.Backbone;
    KernMethods = window.KernMethods;
  }
  
  
  ui.AdminSidebarView = Backbone.view.extend({
    initialize: function() {
      
    },
    id: 'kern-admin-sidebar',
    events: {
      'click .toggle': 'toggle'
    },
    render: function(){
      $(this.el).html('wuuuuu... sidebarrrrr');
      return this;
    },
    toggle: function(){},
  });
  
  
  KernMethods.rules['body:not(.kern-admin)'] = function(analysed, place){
    if (place && !onServer) {
      
      var sidebar = new ui.AdminSidebarView({}, {});
      
    }
  };
  
  _.extend(KernMethods, ui);
  
})(typeof exports === 'undefined' ? this.KernUI = this.KernUI || {} : exports);
