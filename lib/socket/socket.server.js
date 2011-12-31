var _ = require('underscore')._
  , k = require('./../kern')
  , fs = require('fs')
  , path = require('path')
  , url = require('url')
;

exports.extensionName = 'KernSocket';
exports.version = '0.0.1';



exports.extender = function() {
  var K = this
      S = K.settings
  ;
  
  

  K.assets.scripts['/socket.io/socket.io.js'] = {
    external: true,
    weight: -50
  };
  K.assets.scripts['/kern.socket.js'] = {
    filepath: __dirname +'/socket.js',
    weight: -1
  };
  

//  console.info('----------- K.assets.scripts', K.assets.scripts);


  if (S.socketEnabled === false) return;

  K.connected = {};


  K.bind('initialized', function() {
    K.io.sockets.emit('reboot', {});
  });
  
  K.bind('listenning', function(app){

    var sio = require('socket.io');
    K.io = sio.listen(app);
    
    K.io.configure('production', function(){
      io.enable('browser client etag');
      // io.set('log level', 1);
      
      io.set('transports', [
        'websocket'
      , 'xhr-polling'
      , 'jsonp-polling'
      , 'flashsocket'
      //, 'htmlfile'
      ]);
    });
    
    // K.io.configure('development', function(){
    //   io.enable('browser client etag');
    //   io.set('log level', 1);
    //   io.set('transports', ['websocket']);
    // });



    K.io.sockets.on('connection', function(socket) {

      socket.on('set nickname', function (name) {
        socket.set('nickname', name, function () {
          socket.emit('ready');
        });
      });
      
      socket.on('msg', function () {
        socket.get('nickname', function (err, name) {
          console.log('Chat message by ', name);
        });
      });
      
      socket.emit('sid', socket.id);
      K.connected[socket.id] = {
        id: socket.id
      };
      socket.broadcast.emit('newcomer', K.connected[socket.id]);
    });
    
    K.io.sockets.on('sid', function(socket){
      console.log('sid -------------------------', arguments);
      _.extend(K.connected[socked.id], arguments[1]);
      socket.emit('sid', socket.id);
      socket.broadcast.emit('newcomer', K.connected[socket.id]);
    });
    
    
    
    
    
    
    
    
    
    
    
//    function changed(curr, prev) {
//      if (curr.mtime == prev.mtime) return;
//      fs.unwatchFile(K.publicDir() + '/css/style.css');
//      K.notify(null, {
//        title: 'The following assets have changed'
//      , text: '/css/style.css'
//      }, {
//        callback: function(){
//          console.info('RE-Starting watching style.css');
//          fs.watchFile(K.publicDir() + '/css/style.css', changed);
//        }
//      , socketEvent: 'assetchange'
//      , socketData: {
//          styles: [
//            {
//              href: '/css/style.css'
//            }
//          ]
//        }
//      });
//    };
//    
//    // you may want to have a look at <methods.compassWatch>
//    try {
//      console.info('Starting watching style.css');
//      fs.watchFile(K.publicDir() + '/css/style.css', changed);
//    } 
//    catch (e) {
//      console.error(e);
//    }
    
    
    K.bind('contentchange', function(CE) {
      K.log('debug', 'socket', 'Content changed');
      K.io.sockets.emit('contentchange', CE.toJSON());
    });
    
    K.log('info', 'Sockets are listenning too');
  });
};