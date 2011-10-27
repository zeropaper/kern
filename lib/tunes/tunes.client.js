/**
 * This code is borrowed from the excellent introduction screencasts from
 * Peepcode. I can only encourage spending a few bucks (c'mon, the prices
 * are really fair) to watch those videos.
 *
 * I hope that if the guys from Peepcode see that code on GitHub, they won't
 * take offense and if then, at least mail me at
 * zeropaper <you know what comes here> irata.ch
 * before they send me their lawyers.
 */
(function(tunes) {
  var $
    , _
    , Backbone
    , onServer = typeof exports != 'undefined'
  ;
  
  if (onServer) {
    $ = require('jQuery');
    _ = require('underscore')._;
    Backbone = require('backbone');
  }
  else {
    $ = window.jQuery || window.Zepto;
    _ = window._;
    Backbone = window.Backbone;
  }
  
  
  tunes.extender = function() {
    if (typeof _ != 'function') return console.error('No _');
    if (!Backbone) return console.error('No Backbone');
    if (onServer) return;
    if (!MediaElementPlayer) return console.error('No MediaElementPlayer');
    var K = this
      , settings = _.extend({
          playerHolder: '#navigation'
        , playlistHolder: '#navigation'
      }, K.settings.tunes || {})
    ;
    
    var exists = $(settings.playerHolder +' .kern-tunes-player').length > 0;
    if (!exists) {
      $(settings.playerHolder).append('<div class="kern-tunes-player"><audio /><video /><di class="info"><span class="current-time"></span></div></div>');
    }
    var exists = $(settings.playlistHolder +' .kern-tunes-playlist').length > 0;
    if (!exists) {
      $(settings.playlistHolder).append('<ol class="kern-tunes-playlist"></ol>');
    }
    var $audio       = $(settings.playerHolder + ' audio')
      , $video       = $(settings.playerHolder + ' video')
      , $info        = $(settings.playerHolder + ' .info')
      , $currentTime = $(settings.playerHolder + ' .current-time')
      , $playlist    = $(settings.playlistHolder + ' .kern-tunes-playlist')
      , Track        = Backbone.Model.extend({
          initialize: function() {
            
          }
        })
      , Playlist     = Backbone.Collection.extend({
          model: 'Track'
        , initialize: function(models, options) {
            
          }
        , nextTrack: function() {
            
          }
        , playTrack: function() {
            
          }
        })
      , PlaylistView  = Backbone.View.extend({
          tag: 'ol'
        , className: 'playlist'
        , initialize: function(models, options) {
            
          }
        , render: function() {
            
          }
        })
      , mediaElementOptions = {
          // shows debug errors on screen
          enablePluginDebug: false,
          // remove or reorder to change plugin priority
          plugins: ['flash','silverlight'],
          // specify to force MediaElement to use a particular video or audio type
          //type: '',
          // path to Flash and Silverlight plugins
          //pluginPath: '/myjsfiles/',
          // name of flash file
          flashName: 'flashmediaelement.swf',
          // name of silverlight file
          silverlightName: 'silverlightmediaelement.xap',
          // default if the <video width> is not specified
          defaultVideoWidth: 480,
          // default if the <video height> is not specified     
          defaultVideoHeight: 270,
          // overrides <video width>
          //pluginWidth: -1,
          // overrides <video height>       
          //pluginHeight: -1,
          // rate in milliseconds for Flash and Silverlight to fire the timeupdate event
          // larger number is less accurate, but less strain on plugin->JavaScript bridge
          timerRate: 250,
          // method that fires when the Flash or Silverlight object is ready
          success: function (mediaElement, domObject) { 
            var type = domObject.tagName.toLowerCase();
            
            // add event listener
            
            /*
            loadeddata
            progress
            timeupdate
            seeked
            canplay
            play
            playing
            pause
            loadedmetadata
            ended
            volumechange
            */
            
            mediaElement.addEventListener('timeupdate', function(e) {
              $currentTime.text(mediaElement.currentTime);
            }, false);
            
            mediaElement.addEventListener('ended', function(e) {
              playlist.nextTrack();
            }, false);
            
          },
          // fires when a problem is detected
          error: function () { 
            
          }
        }

      , audio = new MediaElement($audio[0], mediaElementOptions);
    ;
    
    function dispatcher(ev) {
      console.info('Events dispatcher called', ev, this);
      
    }
    
    var video = new MediaElement($video[0], mediaElementOptions);
  };
  
  
})(typeof exports == 'undefined' ? this.KernTunes = {} : exports);
