(function($) {
  
  // your JavaScript here
  $(window).resize(function(){
    console.log('screen size '+ screen.width +'x'+ screen.height);
  }).load(function() {
    console.log('screen size '+ screen.width +'x'+ screen.height);
    function draw(size) {
      size = parseInt(size);
      var canvas = this;//document.getElementById("logo");
      var context = canvas.getContext("2d");
      var centerX = size / 2;
      var centerY = size / 2;
      var radius = (size / 2) - (size / 8);
      function decay() {
        return (Math.random() < 0.5 ? 1 : -1) * (Math.random() * (radius / 8));
      }
      context.globalAlpha = 0.8;
      var colors = ['0ff', 'f0f', 'ff0', '000'];
      for (var c in colors) {
        context.beginPath();
        context.arc(centerX + decay(), centerY + decay(), radius, 0, 2 * Math.PI, false);
        context.fillStyle = "#"+ colors[c];
        context.fill();
      }
    }
    var $logo = $('canvas#logo');
    draw.call($logo[0], $logo.width());
      
  	// jQuery plugin definition
  	$.fn.TextAreaExpander = function(minHeight, maxHeight) {
  
  		var hCheck = !($.browser.msie || $.browser.opera);
  
  		// resize a textarea
  		function ResizeTextarea(e) {
  
  			// event or initialize element?
  			e = e.target || e;
  
  			// find content length and box width
  			var vlen = e.value.length, ewidth = e.offsetWidth;
  			if (vlen != e.valLength || ewidth != e.boxWidth) {
  
  				if (hCheck && (vlen < e.valLength || ewidth != e.boxWidth)) e.style.height = "0px";
  				var h = Math.max(e.expandMin, Math.min(e.scrollHeight, e.expandMax));
  
  				e.style.overflow = (e.scrollHeight > h ? "auto" : "hidden");
  				e.style.height = h + "px";
  
  				e.valLength = vlen;
  				e.boxWidth = ewidth;
  			}
  
  			return true;
  		};
  
  		// initialize
  		this.each(function() {
  
  			// is a textarea?
  			if (this.nodeName.toLowerCase() != "textarea") return;
  
  			// set height restrictions
  			var p = this.className.match(/expand(\d+)\-*(\d+)*/i);
  			this.expandMin = minHeight || (p ? parseInt('0'+p[1], 10) : 0);
  			this.expandMax = maxHeight || (p ? parseInt('0'+p[2], 10) : 99999);
  
  			// initial resize
  			ResizeTextarea(this);
  
  			// zero vertical padding and add events
  			if (!this.Initialized) {
  				this.Initialized = true;
  				//$(this).css("padding-top", 0).css("padding-bottom", 0);
  				$(this).bind("keyup", ResizeTextarea).bind("focus", ResizeTextarea);
  			}
  		});
  
  		return this;
  	};
  	$("textarea").TextAreaExpander();
  });
  
})(jQuery || Zepto);
