(function($) {
  var useragent = useragent || '';
  var mobile = (useragent.indexOf('iPhone') != -1 || useragent.indexOf('Android') != -1);
  var map;
  
  
  function initialize() {
    
    function CoordMapType(tileSize) {
      this.tileSize = tileSize;
    }
    
    CoordMapType.prototype.getTile = function(coord, zoom, ownerDocument) {
      var div = ownerDocument.createElement('DIV');
      div.innerHTML = coord;
      div.style.width = this.tileSize.width + 'px';
      div.style.height = this.tileSize.height + 'px';
      div.style.fontSize = '10';
      div.style.borderStyle = 'solid';
      div.style.borderWidth = '1px';
      div.style.borderColor = '#AAAAAA';
      return div;
    };
    
    var chicago = new google.maps.LatLng(41.850033, -87.6500523);
    
    if (!$('#map_canvas').length) 
      return;
    var myOptions = {
      zoom: 10,
      center: chicago,
      mapTypeId: google.maps.MapTypeId.ROADMAP
    };
    
    var map = new google.maps.Map($('#map_canvas')[0], myOptions);
    
    // Insert this overlay map type as the first overlay map type at
    // position 0. Note that all overlay map types appear on top of
    // their parent base map.
    map.overlayMapTypes.insertAt(0, new CoordMapType(new google.maps.Size(256, 256)));
  }
  window.initializeGmap = initialize;
  
  $(window).load(function() {
    var src = 'http://maps.googleapis.com/maps/api/js' +
    '?sensor=' +
    (mobile ? 'true' : 'false') +
    '&callback=initializeGmap';
    $('#content').append('<div class="gmap"><script type="text/javascript" src="' + src + '"></script></div>');
    console.info('Starting gmap');
  });
})(jQuery || Zepto);
