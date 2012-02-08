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
  
  
  
  function CEisAV(CE) {
    return !CE.isDir()
    && (
        (
          CE.has('mime')
          && /$(audio|video)\//i.test(CE.get('mime'))
        ) 
        || 
        (
          CE.absPath()
          && /^\.(mov|avi|mkv|ogg|ogv|mp4|wmv|rm|3gp)$/i.test(path.extname(CE.absPath()))
        )
      )
    ;
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

  

  // KernMethods.rules['video'] = function(analysed, place) {
  //   analysed.medias = analysed.medias || {};
  //   analysed.medias.videos = analysed.medias.videos || {};
  //   var vids = analysed.medias.videos;
  //   if (!place) {
  //     this.each(function() {

  //     });
  //   } else if (this.length) {
  //     $.each(vids, function(ref) {
  //       var attr = ref.split('::').shift();
  //       var val = ref.split('::').pop();
  //       $('[' + attr + '="' + val + '"]', this).attr(attr, val);
  //     });
  //   }
  // };

  // KernMethods.rules['audio'] = function(analysed, place) {
  //   analysed.medias = analysed.medias || {};
  //   analysed.medias.videos = analysed.medias.videos || {};
  //   var vids = analysed.medias.videos;
  //   if (!place) {
  //     this.each(function() {

  //     });
  //   } else if (this.length) {
  //     $.each(vids, function(ref) {
  //       var attr = ref.split('::').shift();
  //       var val = ref.split('::').pop();
  //       $('[' + attr + '="' + val + '"]', this).attr(attr, val);
  //     });
  //   }
  // };
  
  KernMethods.rules.av = function(analysed, place, K) {
    if (!place || onServer) return;

    if (!analysed || !analysed.url) {
      console.info('analysed data are not valid', analysed.url, place);
      return;
    }
    
    if (!analysed.mime) {
      console.info('analysed mime not defined, directory?');
      return;
    }

    var url = analysed.url;//encodeURI(analysed.url);
    
    var player = []
      , mediaelement = false
      , playerWidth = 480
      , playerHeight = 270
      , playerId = _.uniqueId('avplayer-')
    ;
    
    
    
    
    if (/video\//ig.test(analysed.mime)) {
      if (analysed.meta) {
        
        if (analysed.meta.width) playerWidth; 
        if (analysed.meta.height) playerHeight; 
      }
      player.push(K.render('html5-video-player', {
        playerId: playerId,
        width: playerWidth,
        height: playerHeight,
        url: analysed.url,
        originalMime: analysed.mime,
        formats: {
          // mime: ext
          'video/mp4': 'mp4'
        , 'video/webm': 'webm'
        , 'video/ogg': 'ogv'
        },
        flashplayer: '<!-- no flash player fallback here too... -->'
      }));
      mediaelement = true;
    }
    else if (/audio\//ig.test(analysed.mime)) {
      player.push(K.render('html5-audio-player', {
        playerId: playerId,
        url: analysed.url,
        originalMime: analysed.mime,
        formats: {
          // mime: ext
          'audio/mp3': 'mp3'
        , 'audio/mp4': 'm4a'
        , 'audio/ogg': 'oga'
        },
        flashplayer: '<!-- no flash player fallback here too... -->'
      }));
      mediaelement = true;
    }
    else if (/image\//ig.test(analysed.mime)) {
      player.push('<img id="'+playerId+'" src="/i/same'+url+'" alt="'+url+'" />');
    }
    if (player.length < 1) return;
    // $('[data-kern-role=document-body]').html(player.join("\n"));
    analysed.regions.main = player.join("\n");
    console.info('-----------', player, $('[data-kern-role=document-body]'));
    
    if (!mediaelement || !MediaElementPlayer) return;
    
    var playerOptions = {
      // if the <video width> is not specified, this is the default
      defaultVideoWidth: playerWidth,
      // if the <video height> is not specified, this is the default
      defaultVideoHeight: playerHeight,
      // if set, overrides <video width>
      // videoWidth: -1,
      // if set, overrides <video height>
      // videoHeight: -1,
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
      var playerEl = $('#'+ playerId).mediaelementplayer(playerOptions);
      console.info('new player element', playerId, playerEl);
    } catch (e) {
      console.error('Could not use MediaElement');
      console.error(e);
      throw e;
    }
    return player.join("\n");
  };
  
})(typeof exports === 'undefined' ? this.KernVideo = {} : exports);
