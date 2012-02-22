(function(KernSocket){
  
  var onServer   = typeof exports != 'undefined',
      common     = {},
      settings   = {},
      defaults   = {},
      _          = onServer ? require('underscore')._ : window._,
      $
  ;
  
  
  
  
  common.extensionName = 'KernSocket';
  

  
  
  
  function assetsReload(assets, t) {
    for (var a in assets) {
      switch (t) {
        case 'styles':
          if (assets[a].href) {
            var $link = $('link[href^="' + assets[a].href + '"]:last')
              .attr('href', null)
              .attr('href', assets[a].href+'?rd='+Math.random())
            ;
          }
          break;
        case 'scripts':
          break;
      }
    }
  }
  
  
  /**
   * Implements expender hook
   */
  common.extender = function() {
    // this function is overridden on server side, its safe to use the window
    var K = this;
    $ = K.$;
    if (typeof io != 'undefined') {
      var socketUrl = '//' + window.location.host;// +'/kern';
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
    KernSocket,
    common, 
    onServer ? require('./socket.server.js') : {}
  );
})(typeof exports == 'undefined' ? this.KernSocket = {} : exports);