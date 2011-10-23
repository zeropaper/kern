var _ = require('underscore')._
  , k = require('./../kern')
  , fs = require('fs')
  , formidable = require('formidable')
  , http = require('http')
  , sys = require('sys')
;

exports.extender = function(){
  var K = this;
  if (_.isUndefined(K.app)) return;
  K.app.get('/kern', K.basicAuth, function(req, res) {
    console.info(req.url);
    render.call(K ,req, res);
  });
  K.app.post('/kern', K.basicAuth, function(req, res) {
    make.call(K ,req, res);
  });
  _.extend(K.assets.scripts, {
    '/js/lib/jquery-filedrop/jquery.filedrop.js': {
      filepath: K.publicDir() + '/js/lib/jquery-filedrop/jquery.filedrop.js',
      weight: 50
    },
    '/kern.admin.js': {
      callback: function(asset, req, res, next) {
        res.sendfile(__dirname +'/client.js');
      },
      weight: 100
    }
  });
};

function render(req, res){
  var K = this
    , $ = K.$
  ;
  
  
  
  
  
  var content = '';
  
  fs.readFile(K.publicDir() +'/layout.html', function(err, data){
    if (err) next(err);
    res.send(data
      .toString()
      .split('<!-- page content -->')
      .join(content)
    );
  });
};

function make(req, res){
  var K = this
    , $ = K.$
    , fs = require('fs')
    , util = require('util')
  ;
  
  if (req.method.toLowerCase() == 'post') {
    // parse a file upload
    var form = new formidable.IncomingForm();
    
    form.addListener('fileBegin', function(name, file){console.log('fileBegin', arguments);});
    form.addListener('progress', function(bytesReceived, bytesExpected){console.log('progress', arguments);});
    form.addListener('file', function(name, file){console.log('progress', arguments);});
    
    form.parse(req, function(err, fields, files) {
      console.info('err', err, 'fields', fields, 'files', files);
      
      var parentDir = K.paths[unescape(fields.context)];
      if (parentDir.basename() == 'index.html') parentDir = K.paths[parentDir.dirname()];
      
      
      var uploaded = [];
      for (var f in files) {
        var file = files[f];
        
        var is = fs.createReadStream(file.path)
        var os = fs.createWriteStream(K.contentDir() + parentDir.get('parents').join('/') +'/'+ file.name);
        
        util.pump(is, os, function() {
            fs.unlinkSync(file.path);
        });
      }
      res.send({success:true, uploaded: uploaded});
    });
  }
  else {
    return res.send({success: false});
  }
/*
  if (req.xhr) {
    console.info('AJAX request');
    fs.writeFile(path, req.body.content, function(err) {
      if (err) return res.send({success:false, error: err});
      return res.send({success:true});
    });
    return;
  }
  res.redirect(req.url);
*/  
};
