/**
 * CommonJS file
 */

(function(wexpows){
  var Models = {}
    , Collections = {}
    , _
    , Backbone
    , KernMethods
  ;
  
  if (typeof window === 'undefined') {
    _           = require('underscore')._;
    Backbone    = require('backbone');
    KernMethods = require('./methods');
  }
  else {
    _           = window._;
    Backbone    = window.Backbone;
    KernMethods = window.KernMethods;
  }
  
  
  
  var contentEntry =
    Models.contentEntry =
  Backbone.Model.extend(KernMethods.contentEntry);
  
  
  
  var contentChildren =
    Collections.contentChildren =
  Backbone.Collection.extend(_.extend(KernMethods.contentChildren, {
    model: contentEntry
  }));
  
  
  
  _.extend(wexpows, Models);
  _.extend(wexpows, Collections);
  
  
})(typeof exports === 'undefined' ? this['KernBone'] = {} : exports);
