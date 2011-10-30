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
    KernMethods    = require('./../methods');
    Backbone = require('backbone');
  }
  else {
    $ = window.jQuery || window.Zepto;
    _ = window._;
    Backbone = window.Backbone;
    KernMethods    = window.KernMethods;
  }
  
  
  
  tunes.extender = function() {
    console.info("Extending Kern with KernTunes");
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
    /*
    var exists = $(settings.playerHolder +' .kern-tunes-player').length > 0;
    if (!exists) {
      $(settings.playerHolder).append('<div class="kern-tunes-player"><audio /><video /><di class="info"><span class="current-time"></span></div></div>');
    }
    var exists = $(settings.playlistHolder +' .kern-tunes-playlist').length > 0;
    if (!exists) {
      $(settings.playlistHolder).append('<ol class="kern-tunes-playlist"></ol>');
    }
    */
   
    var $audio       = $(settings.playerHolder + ' audio')
      , $video       = $(settings.playerHolder + ' video')
      , $info        = $(settings.playerHolder + ' .info')
      , $currentTime = $(settings.playerHolder + ' .current-time')
      , $playlist    = $(settings.playlistHolder + ' .kern-tunes-playlist')
        
        
        
        
        
        
        
        
      , Track        = Backbone.Model.extend({
          validate: function(attributes) {
            //if (!/^audio\//ig.test(attributes.mime)) return "Not a valid mime type "+ attributes.mime;
          },
          initialize: function(attributes, options) {
            this.set({
              title: attributes.title || attributes.name || attributes.url.split('/').pop()
            }, {silent: true});
          },
          url: function() {
            return this.has('url') ? this.get('url') : false;
          },
          title: function() {
            return this.has('title') ? this.get('title') : 'No title';
          },
          toJSON: function() {
            console.info('toJSON', this);
            return _extend({}, this.attributes, {url: this.url(), cid: this.cid});
          }
        })
        
        
        
        
        
        
      , Playlist     = Backbone.Collection.extend({
          model: Track
        , current: 0
        , player: null
        , initialize: function(models, options) {
            this.player = options.player
          }
        , track: function(n) {
            if (_.isUndefined(n)) n = this.current;
            return this.at(n);
          }
        , next: function() {
            this.current++;
            if (this.current >= this.length) this.current = 0;
            return this.track();
          }
        , prev: function() {
            if (this.current <= 0) this.current = this.length - 1;
            return this.track();
          }
        , toJSON: function() {
            return this.map(function(model){ return _.extend(model.toJSON(), {cid: model.cid}); });
          }
        })
        
        
        
        
        
        
      , PlaylistView  = Backbone.View.extend({
          tag: 'ol'
        , className: 'playlist'
        , initialize: function() {
            _.bindAll(this, 'render');
            this.collection.bind('add', this.render);
            this.collection.bind('playtrack', this.render);
            this.collection.bind('remove', this.render);
            this.template = _.template($('#kern-tunes-tracks-template').html());
            this.controller = this.options.controller;
            console.info('this.options.player instanceof MediaElementPlayer', this.controller.player instanceof MediaElementPlayer);
          }
        , events: {
            'click .title': 'setSrc',
            'click .kick': 'kick',
            'click .forward': 'forward'
          }
        , setSrc: function(ev) {
            var src = '/av/same'+ ($(ev.target).attr('rel') || $(ev.target).text());
            this.controller.player.$media.attr('src', src);
            this.controller.player.play();
          } 
        , kick: function(ev) {
            var cid = $(ev.target).attr('data-cid');
            console.info('kick', cid);
            this.collection.remove([
              this.collection.getByCid(cid)
            ]);
          } 
        , forward: function(ev) {
            console.info('forward');
          } 
        , render: function() {
            if (!this.collection || !_.isFunction(this.collection.pluck)) return this;
            //$(this.el).html('<li>'+ this.collection.pluck('url').join("</li>\n<li>") +'</li>');
            $(this.el).html(this.template({collection: this.collection}));
            return this;
          }
        })
        
        
        
        
        
        
          
          
          
        
        
      , switchPlayPause = function() {
          var states = {
            play: 'pause',
            pause: 'play'
          };
          var curr = $('.pause,.play', this.el).hasClass('play') ? 'play' : 'pause';
          console.info("Switching from "+ curr);
          $('.pause,.play', this.el)
            .removeClass(curr)
            .addClass(states[curr])
            .text(states[curr])
          ;
          

          this.player[states[curr]]();
          
          return false;
        }
        
      , PlayerView = Backbone.View.extend({
          tagName: 'div',
          className: 'kern-tunes-player',
          
          collection: null,
          player: null,
          
          autoplay: true,
          currentTrack: null,
          
          initialize: function() {
            var view = this;
            //_.bindAll(view, 'render');
            view.collection = new Playlist([], {
              controller: view
            });
            
            this.template = _.template($('#kern-tunes-player-template').html());
            
            $(view.el).html(view.template({autoplay: view.autoplay ? ' autoplay="autoplay"' : ''}));
            $('#navigation').prepend(view.el);
            
            
            view.playlist = new PlaylistView({
              el: $('ol.playlist', view.el)[0],
              collection: view.collection,
              controller: view
            });
            
            view.collection.bind('add', function(){
              var playlist = this;
              console.info('A track has been added to the playlist whos length is '+ playlist.length, view.collection == playlist);
              if (playlist.length == 1) view.currentTrack = playlist.at(0);
              view.render();
            });
          },
          events: {
            "click .play":          "play",
            "click .pause":         "pause",
            "click .next":          "next",
            "click .prev":          "prev"
          },
          addTracks: function(tracks) {
            this.collection.add(!_.isArray(tracks) ? [tracks] : tracks);
            return this;
          },
          next: function() {
            var track = this.collection.next();
            this.player.setSrc(track.get('url'));
            return this;
          },
          prev: function() {
            var track = this.collection.next();
            this.player.setSrc(track.get('url'));
            return this;
          },
          play: switchPlayPause,
          pause: switchPlayPause,
          render: function() {
            var view = this;
            console.info('Is this view? ', view == playerView);
            console.info("Rendering asked ", this.currentTrack);
            if (!this.player && this.currentTrack) {
              var track = this.currentTrack
              
              $('audio', this.el).attr('src', '/av/same'+ track.get('url'));
              
              var player = new MediaElementPlayer($('audio', this.el)[0], {
                audioHeight: 30,
                audioWidth: 230,
                features: ['progress','current','duration','tracks','volume'],
                startVolume: 0.8
              });
              $('.mejs-volume-slider', this.el).css('top', '25px');
              function dispatcher(ev) {
                var audioEl = this;
                //console.info('Event ('+ev.type+') triggered?', ev);
                view.trigger(ev.type, ev);
              }
              
              _.each([
                'loadeddata',
                'progress',
                'timeupdate', 
                'seeked', 
                'canplay',
                'play',
                'playing',
                'pause',
                'loadedmetadata',
                'ended',
                'volumechange'
                ], function(eventName){
                player.$media.bind(eventName, dispatcher);
              });
              this.player = player;
            }
            return this;
          }
        })
    ;
    
    var playerView;
    function createPlayer() {
      if (playerView) return;
      console.info('------------------ Tunes can initialize...');
      playerView = new PlayerView({
        id: 'kern-tunes-player'
      });
      window.KernTunesPlayer = playerView.render();
    }
    K.bind('initialized', createPlayer);
    
    K.bind('fileapplied', function(file){
      createPlayer();
      console.info('Correct mime? ', /^audio\//ig.test(file.get('mime')), file.get('mime'), file);
      if (playerView && /^audio\//ig.test(file.get('mime'))) playerView.addTracks(file);
    });
  };
  
    
})(typeof exports == 'undefined' ? this.KernTunes = {} : exports);
