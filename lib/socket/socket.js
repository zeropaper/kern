(function(common){
  
  var onServer   = typeof exports != 'undefined',
      settings   = {},
      defaults   = {},
      _          = onServer ? require('underscore')._ : window._,
      $,
      console    = _.isUndefined(console) ? {} : console
  ;
  
  
  
  
  common.extensionName = 'KernSocket';
//  if (typeof io == 'undefined') return;
  
  
  var user = {
    'set name': function() {
      console.info('Reboot triggered by socket', arguments);
    }
  };
  
  var sys = {
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
      _.each(K.settings.socket.channels, function(channel, channelId) {
        var ioChannel = io.connect(socketUrl +'/'+ channelId);
        
        _.each(channel.on, function(info, eventName) {
          ioChannel.on(eventName, callbacks[channelId][eventName]);
        });
        
        
        K.sockets[channelId] = ioChannel;
        K.trigger('socket '+ channelId +'initialized', ioChannel);
      });
    });
//    if (console) console.info('Socket ready', K.sockets);
    
    /*
    if (typeof io != 'undefined') {
      
      
      
      K.bind('extended', function(){
        console.info('Socket extension loading.....');
        socket = {};
        socket = io.connect(socketUrl);
        
        socket.on('connection', function(data) {
          console.info('Connected to Kern');
        });
        
        socket.on('reboot', function () {
          K.notify(null, {
            title: "System reboot",
            text: "The system changed and needs to be rebooted in the browser too."
          });
          setTimeout(function() {
            window.location.reload();
          }, 1000);
        });
        
        
        
        socket.on('newcomer', function(newcomer){
          K.notify({
            title: 'Newcomer',
            text: newcomer.id
          });
        });
        
        socket.on('sid', function(sid) {
          console.log('Received a socket id:'+ sid);
          K.socketId = sid;
        });
        
        
        socket.on('contentchange', function(data) {
          console.group('Socket content change.', data);
          K.notify({
            title: 'Content changed',
            text: data.id
          });
          K.paths[data.id].set(data);
          // if (window.location.hash == '#!'+ data.id) K.applyFile(data.id);
          console.groupEnd();
        });
        
        
        socket.on('assetchange', function(data) {
          console.group('Socket asset change.');
          console.info("Some assets change", data);
          if (_.isArray(data)) {
            for (var t in data) {
              var assets = data[t];
              assetsReload(assets, t);
              // K.notify({title: 'Reloaded '+ t});
            }
          }
          else if (_.isString(data)) {
            var selector = '[href^="'+ data +'"],[src^="'+ data +'"]';
            console.info('Replace one file', selector);
            $(selector).each(function(){
              
              var attr = $(this).attr('src') && $(this).attr('src').split(data).length == 2 ? 'src' : 'href';
              console.info('asset found', this, attr, data);
              $(this).attr(attr, '');
              $(this).attr(attr, data +'?r='+ escape(new Date().toUTCString()));
            });
          }
          console.groupEnd();
        });
        
        socket.on('changelocation', function(data) {
          console.log('Location changed' + data.newURL, data);
          K.applyFile(data.newURL);
        });
        
        socket.on('logging', function(data){
          var now = new Date();
          now = now.getTime();
          console.log('Received debug info from server ('+Math.round((now - data.started))+')');
        });
        K.socket = socket;
      
      });
    }
    
    _.extend(settings, K.settings.KernSocket || (K.settings.KernSocket = {}));
    */
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