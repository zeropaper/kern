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
  
  KernMethods.rules['image'] = function(analysed, place) {
    if (!place) return;
    var url = encodeURI(analysed.url);
    var player = [];
    console.info('Try to create a player for '+ analysed.mime, analysed);
    var playerId = _.uniqueId('avplayer-');
    player.push('<img id="'+playerId+'" src="/i/same'+url+'" alt="'+url+'" />');
    
    if (!player.length) return;
    $('[data-kern-role=document-body]').html(player.join("\n"));
  };
  
  console.info('KernMethods.prototype', KernMethods);
})(typeof exports == 'undefined' ? this.KernImage = {} : exports);
