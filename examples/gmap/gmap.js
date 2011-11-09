var _ = require('underscore')._
  , k = require('./../../lib/kern')
  , fs = require('fs')
;

exports.extender = function() {
  var K = this;
  if (_.isUndefined(K.app)) return;
  
  K.app.get('/gmap/gmap.js', function(req, res, next){res.sendfile(__dirname +'/gmap.client.js');});
  K.app.get('/gmap/gmap.css', function(req, res, next){res.sendfile(__dirname +'/gmap.css');});
  
  K.app.get('/gmap', function(req, res) {
    console.info(req.url);
    
    K.loadLayout();
    var analysed = K.analyse(fs.readFileSync(__dirname +'/gmap.html').toString());
    var options = _.extend(analysed, {
      Kern: K,
      styles: {'/gmap/gmap.css': {href:'/gmap/gmap.css'}},
      scripts: _.extend({}, K.assets.scripts, {
        '/gmap/gmap.js': {}
      })
    });
    K.apply(options);
    res.send(require(k.Kern.__dir +'/fs/delivery').fixHTML(K.$('html').html(), options));
    /*    
    fs.readFile(__dirname +'/gmap.html', function(err, data){
      if (err) next(err);
      res.send(data
        .toString()
        .split('<!-- page content -->')
        .join(content)
      );
    });
    */
  });
};
