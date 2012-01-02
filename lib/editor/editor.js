var _ = require('underscore')._
  , k = require('./../kern')
  , fs = require('fs')
;

exports.extensionName = 'KernEditor';

exports.extender = function(){
  var K = this;
  if (_.isUndefined(K.app)) return;
  K.app.get('/kern/editor', K.basicAuth, function(req, res) {
    render.call(K ,req, res);
  });
  K.app.post('/kern/editor', K.basicAuth, function(req, res) {
    save.call(K ,req, res);
  });
};

function render(req, res, next){
  var files = this.struct.toJSON()
    , $ = require('jQuery')
    , _ = require('underscore')._
    , K = this
  ;
  
  file = K.paths[req.query.file].toJSON() || {
    title: 'The document title',
    regions:{
      main: 'Your new document',
      aside: 'Some side notes'
    }
  };
//  K.log('info', 'req.query.file: '+req.query.file, _.keys(file).join(', '));
  
  function escapeHtml(unsafe) {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;")
    ;
  }
  
  try {
    var options = _.extend({
      Kern: K
    , req: req
    , res: res
    , file: file
    , root: req.url
    , clientSettings: {
        port: 8080,
        host: 'localhost',
        pageAtStart: K.settings.pageAtStart
      }
    }, file.regions || {});
    
    content = require('./../fs/delivery').renderLayout.call(K, options, {
      contentDir: K.contentDir()
    });
  }
  catch (e) {
    K.log('error', e);
    content = e.message;
  }
  
  var output = [
    '<noscript>Without javascripts activated, my recommendation to edit the document is to use vim...</noscript>'
  
  , '<form action="'+ req.url +'" method="post">'
  , '<input type="hidden" value="path" value="'+req.query.file+'"/>'
  
  , '<div id="notifier"><div id="notificationdefault"><h3>#{title}</h3><div>#{text}</div></div></div>'
  , '<div id="editor">'
  , '<textarea id="content" name="content">'
  , content
  , '</textarea>'
  , '</div>'

  , '<div id="attributes">'
  , '<input type="text" name="document-title" placeholder="The page title" value="'+$.trim(file && file.title ? file.title : '')+'" />'
  , '<input type="submit" value="Save" />'
  , '</div>'

  , '</form>'
  ];
  fs.readFile(__dirname +'/editor.html', function(err, data){
    if (err) next(err);
    res.send(data
      .toString()
      .split('<!-- page content -->')
      .join(output.join("\n\n"))
    );
  });
};


function save(req, res, next){
  function emit() {
    var io = require.main.exports.io;
    if (io && typeof io.sockets !== 'undefined') {
      io.sockets.emit('contentchange', {path: req.query.file});
    }
  }
  
  var fs = require('fs')
    , path = this.contentDir() + req.query.file
  ;
  
  if (req.xhr) {
    K.log('info', 'AJAX request');
    fs.writeFile(path, req.body.content, function(err) {
      if (err) return res.send({success:false, error: err});
      emit();
      return res.send({success:true});
    });
    return;
  }
  fs.writeFile(path, req.body.content, function(err) {
    if (err) return next(err);
    emit();
    res.redirect(req.url);
  });
};
