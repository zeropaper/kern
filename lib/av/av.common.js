(function(wexpows){
  var onServer = typeof exports !== 'undefined'
    , KernMethods
  ;
  
  if (onServer) {
    KernMethods    = require('./../methods');
  }
  else {
    KernMethods    = window.KernMethods;
  }
  
  
  if (onServer) return;
  
  KernMethods.rules['av'] = function(analysed, place) {
    if (!place) return;
    var url = analysed.url;//encodeURI(analysed.url);
    var player = []
      , mediaelement = false
    ;
    console.info('Try to create a player for '+ analysed.mime, analysed);
    var playerId = _.uniqueId('avplayer-');
    if (/video\//ig.test(analysed.mime)) {
      player.push('<video id="'+playerId+'" poster="/av/same'+url+'.png" controls="controls" preload="none">');
      player.push('<source type="'+analysed.mime+'" src="/av/same'+url+'" />');
      player.push('<source type="video/mp4" src="/av/same'+url+'.mp4" />');
      player.push('<source type="video/webm" src="/av/same'+url+'.webm" />');
      player.push('<source type="video/ogg" src="/av/same'+url+'.ogg" />');
      player.push('</video>');
      mediaelement = true;
    }
    else if (/audio\//ig.test(analysed.mime)) {
      player.push('<audio id="'+playerId+'" controls="controls" preload="none">');
      player.push('<source type="'+analysed.mime+'" src="/av/same'+url+'" />');
      player.push('</audio>');
      mediaelement = true;
    }
    else if (/image\//ig.test(analysed.mime)) {
      player.push('<img id="'+playerId+'" src="/i/same'+url+'" alt="'+url+'" />');
    }
    
    if (!player.length) return;
    $('[role=document-body]').html(player.join("\n"));
    if (mediaelement) {
      console.info('Trying ', MediaElementPlayer, playerId);
      if (!MediaElementPlayer) return false;
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
        var player = $('#'+ playerId).mediaelementplayer(playerOptions)
        // JavaScript object for later use
        /*
        var player = new MediaElementPlayer('#'+playerId, playerOptions);
        // ... more code ...
        player.pause();
        //player.setSrc(url);
        */
        player.play();
      } catch (e) {
        console.error('Could not use MediaElement');
        console.trace(e);
      }
    }
  };
  
  console.info('KernMethods.prototype', KernMethods);
})(typeof exports === 'undefined' ? this.KernVideo = {} : exports);
