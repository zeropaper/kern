var _ = require('underscore')._
  , fs = require('fs')
  , http = require('http')
  , url = require('url')
  , path = require('path')
  , child_process = require('child_process')
  , Inotify = false
;

exports.accept = /^text\//i;

exports.parser = function(info, cb) {
  var CE = this
    , content = ''
  ;
  fs.readFile(CE.absPath(), function (err, data) {
    if (err) return;//throw err;
    data = data.toString();
    
    try {
      switch (info.ext) {
        case 'md':
        case 'markdown':
          var md = require("node-markdown").Markdown;
          content = md(data);
          //console.info('Markdown parsing content of '+ info.name, content);
          break;
        case 'txt':
        case 'readme':
          content = '<pre>'+ data +'</pre>';
          break;
        case 'php':
        case 'rb':
        case 'inc':
        case 'js':
        case 'coffee':
          var hl = require("highlight").Highlight;
          content = hl(data);
          //console.info('Highlighting content of '+ info.name, content);
          break;
      }
      
      if (content != data) {
        content = '<div role="document-body"><div class="parsed">'+ content +'</div>';
        content += '<form class="unparsed-content"><div class="inner"><textarea name="content">'+ data +'</textarea></div></form></div>';
      }
      CE.set(K.analyse(content), {silent: true});
    }
    catch (e) {
      // console.error(e);
      CE.set({
        error: e,
        title: 'Parsing error',
        regions: {
          main: e.message
        }
      }, {silent: true});
    }
    
  });
};