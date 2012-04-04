(function(common){
  
  var onServer   = typeof exports != 'undefined',
      settings   = {},
      defaults   = {},
      _          = onServer ? require('underscore')._ : window._,
      $,
      _f         = function() {}
      console    = _.isUndefined(console) ? {info: _f, log: _f, error: _f} : console
  ;
  
  
  
  
  common.extensionName = 'KernSocket';
//  if (typeof io == 'undefined') return;
  
  
  var user = {
    'set name': function() {
      console.info('Reboot triggered by socket', arguments);
    }
  };
  
  var sys = {
    bing: function() {
      console.info('Bing!', arguments);
    },
    reboot: function() {
      console.info('Reboot triggered by socket', arguments);
    },
    reload: function() {
      console.info('Reload triggered by socket', arguments);
    }
  };
  
  var assets = {
    reload: function(assets, t) {
      console.info('Assets reload triggered by socket', arguments);
      var q;
      for (var a in assets) {
        var asset = assets[a];
        switch (t) {
          case 'styles':
            console.info('Reloading style asset', a, asset);
            if (asset.href) {
              q = asset.href.indexOf('?') > -1 ? '&' : '?';
              var $link = $('link[href^="' + asset.href + '"]:last')
                .attr('href', null)
                .attr('href', asset.href+q+'rd='+Math.random())
              ;
            }
            else if (asset.content) {
              
            }
            break;
          case 'scripts':
            console.info('Reloading script asset', a, asset);
            if (asset.src) {
              q = asset.src.indexOf('?') > -1 ? '&' : '?';
              var $script = $('script[src^="' + asset.href + '"]:last')
                .attr('src', null)
                .attr('src', asset.href+q+'rd='+Math.random())
              ;
            }
            else if (asset.content) {
              
            }
            break;
        }
      }
    }
  };
  
  var content = {
    reload: function(content) {
      console.info('Content reload triggered by socket', arguments);
    }
  };
  
  var channels = {
    sys: sys,
    user: user,
    assets: assets,
    content: content
  };
  
  
  var socketUrl;
  
  
  /**
   * Implements expender hook
   */
  common.extender = function() {
    
    var K = this;
    $ = K.$;
    K.sockets = {};
    
    // this function is overridden on server side, its safe to use the window
    socketUrl = K.settings.socket.url || '//'+ window.location.host;
    
    K.bind('initialized', function() {
      console.info('initializing socket channels', K.settings.socket.channelsInfo);

      _.each(K.settings.socket.channelsInfo, function(channel, channelId) {
        console.info('initializing '+ channelId);
        K.sockets[channelId] = io.connect(socketUrl +'/'+ channelId);
        
        var callbacks = channels[channelId];//channel.on.client;
        _.each(callbacks, function(info, eventName) {
          console.info('adding '+ channelId+':'+ eventName);
          K.sockets[channelId].on(eventName, channels[channelId][eventName]);
        });

        K.trigger('socket '+ channelId +' initialized', K.sockets[channelId]);
      });
      K.trigger('sockets initialized');
    });

  };
  
  
  /**
   * Implements initialize hook
   */
  common.initialize = function() {
    var K = this;
    console.info('---- KernSocket ----- is initializing Kern');
    
    K.trigger('KernSocket:initialized');
  };
  
  
  _.extend(
    common, 
    onServer ? require('./socket.server.js') : {}
  );
})(typeof exports == 'undefined' ? this.KernSocket = {} : exports);