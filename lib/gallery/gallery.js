(function(gallery){
  
  var onServer   = typeof exports != 'undefined',
      settings   = {},
      defaults   = {},
      _          = onServer ? require('underscore')._ : window._,
      Backbone   = onServer ? require('backbone') : window.Backbone,
      $,
      GalleryCollection,
      GalleryView
  ;
  
  gallery.extensionName = 'KernGallery';
  
  
  
  /**
   * Implements expender hook
   */
  gallery.extender = function() {
    console.info("KernGallery is extending....");
    // this function is overriden on server side, its safe to use the window
    var K = this;
    $ = K.$;
    
    K.bind('gallery:initialized', function(){
      console.info('The gallery module has been initialized, client side');
      console.info('$ is '+ typeof $);
    });
    K.bind('initialized', function() {
      gallery.initialize.call(K);
    });
    
    
    GalleryView = Backbone.View.extend({
      tagName: 'ol',
      initialize: function() {
        _.bindAll(this, 'render');
        this.collection.bind('reset', function() {
          console.info('The gallery collection has been reseted. triggered from the view.', this);
        });
      },
      events: {
        'click .prev': 'prev',
        'click .next': 'next'
      },
      render: function() {
        console.info('Rendering the gallery view');
        $(this.el).html('Gallery view comes here');
        return this;
      }
    });
    
    GalleryCollection = Backbone.Collection.extend({
      model: K.models.ContentEntry,
      current: 0,
      view: null,
      image: function(n) {
        if (_.isUndefined(n)) n = this.current;
        return this.at(n);
      },
      next: function() {
        this.current++;
        if (this.current >= this.length) this.current = 0;
        return this.image();
      },
      prev: function() {
        this.current--;
        if (this.current <= 0) this.current = this.length - 1;
        return this.image();
      },
      toJSON: function() {
        var coll = this;
        return this.map(function(model, i){ return _.extend(model.toJSON(), {cid: model.cid, current: coll.current == i ? 'current' : ''}); });
      },
      initialize: function(models, options) {
        this.view = new GalleryView({
          collection: this
        });
        this.bind('reset', function() {
          console.info('The gallery collection has been reseted.', this);
          this.view.render();
        });
      }
    });
    
    
    _.extend(settings, K.settings.gallery || (K.settings.gallery = {}));
  };
  
  
  /**
   * Implements initialize hook
   */
  gallery.initialize = function() {
    var K = this;
    $ = K.$;
    console.info("KernGallery is initializing....");
    if (onServer) return;
    
    var K = this;
    console.info('---- Gallery ----- is initializing Kern');
    
    var kernGallery = new GalleryCollection([]);
    console.info('The gallery as been filled', kernGallery);
    
    window.kernGallery = kernGallery;
    
    K.bind('fileapplied', function(){
      var entries = [];
      $('.image-jpeg, .image-png, .image-gif').each(function(){
        var entry = K.paths[$('a', this).attr('href')];
        if (!entry) return;
        $(this).hide();
        entries.push(entry);
      });
      kernGallery.reset(entries);
    });
    
    K.trigger('gallery:initialized', kernGallery);
  };
  
  
  _.extend(
    gallery,
    onServer ? _.extend(gallery, require('./gallery.server.js')) : {}
  );
})(typeof exports == 'undefined' ? this.KernGallery = {} : exports);
