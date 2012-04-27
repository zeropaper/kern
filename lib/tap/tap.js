var _ = require('underscore')._
  , k = require('./../kern')
  , fs = require('fs')
;

exports.extender = function(){
  var K = this;
  if (_.isUndefined(K.app)) return;
  
  K.app.get('/tap', function(req, res) {
    
    render.call(K ,req, res);
  });
  K.app.post('/tap', function(req, res) {
    
    make.call(K ,req, res);
  });
};

function render(req, res){
  var K = this
    , $ = K.$
  ;
  
  
  
  
  var content = '';
  
  fs.readFile(__dirname +'/tap.html', function(err, data){
    if (err) next(err);
    res.send(data
      .toString()
      .split('<!-- page content -->')
      .join(content)
    );
  });
};
