/**
 * CommonJS file
 */

(function(wexpows){
  var Models = {}
    , Collections = {}
    , Views = {}
    , _
    , Backbone
    , KernBone
    , KernMethods
  ;
  
  
  
  if (typeof window === 'undefined') {
    _           = require('underscore')._;
    Backbone    = require('backbone');
    KernMethods = _.extend(require('./methods'), require('./../methods'));
    _.extend(KernMethods.contentEntry, require('./../methods').contentEntry);
    _.extend(KernMethods.contentChildren, require('./../methods').contentChildren);
    wexpows     = exports;
  }
  
  else {
    _           = window._;
    Backbone    = window.Backbone;
    KernMethods = window.KernMethods;
    wexpows     = window.KernBone;
  }
  

  // TODO: this way to wickied...
  
  var CE =
    Models.ContentEntry =
  Backbone.Model.extend(KernMethods.contentEntry);
  
  
  var CC =
    Collections.ContentChildren =
  Backbone.Collection.extend(_.extend(KernMethods.contentChildren, {
    model: CE
  }));
  
  var CP =
    Collections.ContentParents =
  Backbone.Collection.extend(_.extend(KernMethods.contentParents, {
    model: CE
  }));
  
  wexpows.models = Models;
  wexpows.collections = Collections;
  wexpows.views = Views;
  
})(typeof exports === 'undefined' ? this['KernBone'] = {} : exports);
