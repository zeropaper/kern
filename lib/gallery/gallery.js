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
    
    // this function is overriden on server side, its safe to use the window
    var K = this;
    $ = K.$;
    
    K.bind('gallery:initialized', function(){
      
      
    });
    K.bind('initialized', function() {
      gallery.initialize.call(K);
    });
    
    GalleryView = Backbone.View.extend({
      tagName: 'ol',
      initialize: function() {
        _.bindAll(this, 'render');
        this.template = _.template($('#kern-gallery-images-template').html());
        this.collection.bind('reset', function() {
          
        });
      },
      events: {
        'click .prev': 'prev',
        'click .next': 'next'
      },
      render: function() {
        
        if (this.collection.length) $(this.el).html(this.template({
          collection: this.collection.toJSON(),
          preset: '/i/micro',
          current: this.collection.image().toJSON()
        }));
        return this;
      },
      prev: function(){
        
        this.collection.prev();
        this.render();
      },
      next: function(){
        
        this.collection.next();
        this.render();
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
          collection: this,
          el: options.el
        });
        
        this.bind('reset', function() {
          
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
    
    K.settings.image.presets.micro = [
      '-thumbnail'
    , '45x45^'
    , '-gravity'
    , 'center'
    , '-extent'
    , '45x45'
    ];
    
    if (onServer) return;
    
    var K = this;
    $ = K.$;
    
    
    if (!$('#kern-gallery"').length) {
      $('#content').append('<div id="kern-gallery">');
    }
    else {
      $('#kern-gallery"').empty();
    }
    
    var kernGallery = new GalleryCollection([], {
      el: $('#kern-gallery')[0]
    });
    
    window.kernGallery = kernGallery;
    function applyGallery() {
      
      
      var entries = [];
      $('.image-jpeg, .image-png, .image-gif').each(function(){
        var entry = K.paths[$('a', this).attr('href')];
        if (!entry) return;
        $(this).remove();
        entries.push(entry);
      });
      
      kernGallery.reset(entries);
      
      
    }
    K.bind('fileapplied', applyGallery);
    applyGallery();
    K.trigger('gallery:initialized', kernGallery);
  };
  
  
  _.extend(
    gallery,
    onServer ? _.extend(gallery, require('./gallery.server.js')) : {}
  );
})(typeof exports == 'undefined' ? this.KernGallery = {} : exports);
