var _ = require('underscore')._
  , k = require('./../kern')
  , fs = require('fs')
  , path = require('path')
  , url = require('url')
;

exports.extensionName = 'KernSocket';
exports.version = '0.0.1';

exports.assets = {
  scripts: {
    '/socket.io/socket.io.js': {
      external: true,
      weight: -50
    },
    '/kern.socket.js': {
      filepath: __dirname +'/socket.js',
      weight: -1
    }
  }
};



exports.extender = function() {
  
  var K = this,
      S = K.settings.socket || (K.settings.socket = {})
  ;

  S.channelsInfo = S.channelsInfo || {};
  
  function getChannel(name) {
    K.sockets = K.sockets || (K.sockets = {});
    return K.sockets[name] || false;
  }

  function openChannel(channel, channelId) {
    var ioChannel = K.io.of('/'+ channelId);
    

    ioChannel.on('connection', function(socket) {
      
      storage[channelId] = storage[channelId] || {};
      storage[channelId][socket.id] = {
        'name': _.uniqueId('User ')
      };
      
      if (!_.isUndefined(channel.on) && !_.isUndefined(channel.on.channel)) _.each(channel.on.server || (channel.on.server = {}), function(callback, eventName) {
        socket.on(eventName, callback);
        S.channels[eventName] = {};
      });
      
      
      K.sockets[channelId] = socket;
    });
    
    S.channelsInfo[channelId] = channel;
  }
  
  if (K.get('_socketEnabled') === false) return;
  
  _.extend(K.assets.scripts, exports.assets.scripts);

  K.connected = {};
  
  var storage = {};
  
  S = S || (S = {});
  S._channels = S._channels || (S._channels = {});
  S.channels = S.channels || (S.channels = {});
  var _channels = S._channels;
  
  var channels = {
    'user': {
      'on': {
        'server': {
          'get sid': function(socket) {
            var s = storage.user[socket.id];
            socket.emit('sid', socket.id);
          },
          'get name': function(socket) {
            var s = storage.user[socket.id];
            socket.emit('name', s.name);
          },
          'set name': function(socket) {
            var s = storage.user[socket.id];
            socket.emit('name', s.name);
          }
        },
        'client': {
          'get state': {}
        }
      }
    },
    'sys': {
      'on': {
        'server': {
        },
        'client': {
          'get state': {}
        }
      }
    },
    'assets': {
      'on': {
        'server': {
        },
        'client': {
          'get state': {}
        }
      }
    }
  };
  
  



  K.bind('listenning', function(app){
    
    var sio = require('socket.io');
    K.io = sio.listen(app);

    // https://github.com/LearnBoost/Socket.IO/wiki/Configuring-Socket.IO
    function configure() {
      io.enable('browser client etag');
      io.set('log level', 0);
      io.set('browser client minification', true);
      io.set('browser client etag', true);
      
      io.set('transports', [
          'websocket'
        , 'xhr-polling'
        , 'jsonp-polling'
        , 'flashsocket'
        , 'htmlfile'
      ]);
    }

    K.io.configure('production', configure);
    K.io.configure('development', configure);

    K.sockets = K.sockets || {};
    _.each(channels, openChannel);
    K.trigger('sockets initialized', K.sockets);

    K.bind('assetchange', function(asset) {
      
      if (_.isUndefined(K.sockets)) return;
      if (_.isUndefined(K.sockets.assets)) {
        
        return;
      }
      K.sockets.assets.emit('reload', [{
        href: '/css/style.css'
      }], 'styles');
    });
    
    K.bind('contentchange', function(CE) {
      var channel = getChannel('content');
      
      if (channel) emit('reload', CE.toJSON());
    });
    
  });
};