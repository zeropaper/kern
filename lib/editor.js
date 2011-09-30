exports.render = function(req, res){
  var files = this.files
    , $ = require('jquery')
    , _ = require('underscore')._
    , k = require('kern')
  ;
    
  file = files[req.query.file] || {
    title: 'The document title',
    regions:{
      main: 'Your new document'
    },
    content: 'An empty document'
  };
  
  function escapeHtml(unsafe) {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;")
    ;
  }
  
  content = require('./fs/delivery').renderLayout(file, {
    contentDir: require.main.dirname +'/content'
  });
  
  var output = [
    '<html>'
  
  , '<head>'
  , '<link type="text/css" rel="stylesheet" href="/js/lib/jquery-ui/themes/base/jquery.ui.all.css" />'
  , '<link type="text/css" rel="stylesheet" href="/js/lib/jquery-notify/ui.notify.css" />'
  , '<script type="text/javascript" src="/js/lib/jquery.min.js"></script>'
  , '<script type="text/javascript" src="/js/lib/jquery-ui/ui/jquery.ui.core.js"></script>'
  , '<script type="text/javascript" src="/js/lib/jquery-ui/ui/jquery.ui.widget.js"></script>'
  , '<script type="text/javascript" src="/js/lib/jquery-notify/src/jquery.notify.min.js"></script>'
  , '<script type="text/javascript" src="/js/lib/jquery.form.js"></script>'
  , '<script type="text/javascript" src="/js/lib/ckeditor/ckeditor.js"></script>'
  , '<script type="text/javascript" src="/js/lib/ckeditor/adapters/jquery.js"></script>'
  , '<script type="text/javascript" src="/js/editor.js"></script>'
  , '</head>'
  
  , '<body>'
  
  , '<noscript>Without javascripts activated, my recommendation to edit the document is to use vim...</noscript>'
  
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
  
  , '<style type="text/css">body{margin:0;padding:0;}.ui-notify{color: #fff;}span.cke_skin_kama{padding:0;}</style>'
  
  , '</body>'
  
  , '</html>'
  ];
  res.send(output.join("\n"));
};

exports.save = function(req, res){
  function emit() {
    var io = require.main.exports.io;
    if (io && typeof io.sockets !== 'undefined') {
      io.sockets.emit('filechange', {path: req.query.file});
    }
  }
  
  var fs = require('fs')
    , path = this.contentDir() + req.query.file
  ;
  
  if (req.xhr) {
    console.info('AJAX request');
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
