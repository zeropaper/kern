(function(wexpows){
  var onServer = typeof exports !== 'undefined'
    , KernMethods
    , _
    , $
    , Backbone
  ;
  
  if (onServer) {
    KernMethods    = require('./../methods');
    $              = require('jQuery');
    _              = require('underscore')._;
    Backbone       = require('Backbone');
  }
  else {
    KernMethods    = window.KernMethods;
    $              = window.jQuery || window.Zepto;
    _              = window._;
    Backbone       = window.Backbone;
  }
  
  
//  if (onServer) return;
  
  
  var MediaView = Backbone.View.extend({
    tagName: 'audio',
    className: 'kern-tunes-element',
    initialize: function() {
      _.bindAll(this, 'render');
      this.template = _.template('<% _.each(formats, function(ext, format){ %><source src="/av/same<%= src %>.<%= ext %>" type="<%= format %>" /><% }); %>');
    },
    render: function(locals) {
      this.tagName = locals.type;
      var src = locals.src;
      var formats = {};
      
      $(this.el).html(this.template({
        src: locals.src
      }));
      return this;
    }
  });
  
  var mediaView = new MediaView({});
  
  KernMethods.rules['av'] = function(analysed, place) {
    if (!place || !analysed || !analysed.url) return;
    var url = analysed.url;//encodeURI(analysed.url);
    
    var player = []
      , mediaelement = false
    ;
    
    var playerId = _.uniqueId('avplayer-');
    if (/video\//ig.test(analysed.mime)) {
      player.push('<video id="'+playerId+'" rel="/av/same'+url+'" poster="/av/same'+url+'.png" controls="controls" preload="none">');
      player.push('<source type="'+analysed.mime+'" src="/av/same'+url+'" />');
      player.push('<source type="video/mp4" src="/av/same'+url+'.mp4" />');
      player.push('<source type="video/webm" src="/av/same'+url+'.webm" />');
      player.push('<source type="video/ogg" src="/av/same'+url+'.ogg" />');
      player.push('</video>');
      mediaelement = true;
    }
    else if (/audio\//ig.test(analysed.mime)) {
      player.push('<audio id="'+playerId+'" rel="/av/same'+url+'" controls="controls" preload="none">');
      player.push('<source type="'+analysed.mime+'" src="/av/same'+url+'" />');
      player.push('</audio>');
      mediaelement = true;
    }
    else if (/image\//ig.test(analysed.mime)) {
      player.push('<img id="'+playerId+'" src="/i/same'+url+'" alt="'+url+'" />');
    }
    
    console.info("Create a player for URL: "+ url +", type: "+ analysed.mime, player.join("\n"));
    if (!player.length) return;
    $('[role=document-body]').html(player.join("\n"));
    
    if (!mediaelement || !MediaElementPlayer) return;
    
    var playerOptions = {
      // if the <video width> is not specified, this is the default
//        defaultVideoWidth: 480,
      // if the <video height> is not specified, this is the default
//        defaultVideoHeight: 270,
      // if set, overrides <video width>
      videoWidth: -1,
      // if set, overrides <video height>
      videoHeight: -1,
      // width of audio player
//        audioWidth: 180,
      // height of audio player
//        audioHeight: 180,
      // initial volume when the player starts
      startVolume: 0.8,
      // useful for <audio> player loops
      loop: false,
      // enables Flash and Silverlight to resize to content size
      enableAutosize: true,
      // the order of controls you want on the control bar (and other plugins below)
      features: ['playpause', 'progress', 'current', 'duration', 'tracks', 'volume', 'fullscreen'],
      
      // automatically selects a <track> element
      startLanguage: '',
      // a list of languages to auto-translate via Google
      translations: [],
      // a dropdownlist of automatic translations
      translationSelector: false
      
      // key for tranlsations
      //googleApiKey: ''
    
    };
    
    try {
      var player = $('#'+ playerId).mediaelementplayer(playerOptions);
      console.info('new player', player);
      
    } catch (e) {
      console.error('Could not use MediaElement');
      console.error(e);
    }
  };
  
})(typeof exports === 'undefined' ? this.KernVideo = {} : exports);
