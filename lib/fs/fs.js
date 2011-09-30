var _ = require('underscore')._
  , Backbone = require('backbone')
  , crypto = require('crypto')
  , fs = require('fs')
  , mime = require('mime')
;
mime.define({
  'text/plain': ['md', 'markdown']
//  , 'application/x-woff': ['woff']
});



_.extend(exports, require('./../common/methods').fs);




//---------------------------------------------------------------------
// File system
//---------------------------------------------------------------------


var parsers = exports.parsers = {
  'text/html': function(info) {
    // does not need to be converter into HTML... obviously
  },
  'text/plain': function(info) {
    var content = info.content;
    var ext = info.name.split('.').pop();
    try {
      switch (ext) {
        case 'md':
        case 'markdown':
          var md = require("node-markdown").Markdown;
          content = md(info.content);
          //console.info('Markdown parsing content of '+ info.name, content);
          break;
        case 'txt':
        case 'readme':
          content = '<pre>'+ info.content +'</pre>';
          break;
        case 'php':
        case 'rb':
        case 'inc':
          var hl = require("highlight").Highlight;
          content = hl(info.content);
          //console.info('Highlighting content of '+ info.name, content);
          break;
      }
    }
    catch (e) {
      // console.error(e);
      content = e.message;
    }
    if (content != info.content) {
      content = '<div role="document-body"><div class="parsed">'+ content +'</div>';
      content += '<form class="unparsed-content"><div class="inner"><textarea name="content">'+ info.content +'</textarea></div></form></div>';
    }
    
    return {
      title: info.name,
      content: content
    };
  }
};

/**
 *  Function: _scanSync
 *  A local function to recursively scan a directory
 *  
 *  Section: Server side
 *  
 *  Parameters:
 *    string directory - A directory path
 *  Returns: obj
 *  A hash structured like a tree
 */
function _scanSync(directory) {
  // console.info('fs/fs.js, _scanSync('+ directory +')');
  var absPath  = directory
    , K     = this
    , exp      = /\.js|\.css|\.nd|~/ig
  ;
  
  directory = directory.split(K.contentDir()).join('');
  
  parts = directory.split('/');
  
  var info = {
    name:         parts[parts.length - 1],
    depth:        parts.length - 1,
    parents:      parts.slice(0, parts.length - 1),
    hidden:       false,
    title:        null
  };
  info.url = info.parents.join('/') +'/'+ info.name;
  
  //console.info('???? scanning '+ info.name);
  
  if (fs.statSync(absPath).isDirectory()) {
    // this is a directory, we scan for children
    info.children = {};
    //console.info(' --- entering directory: '+ absPath);
    var files = fs.readdirSync(absPath);
    for (var f in files) {
      var name = files[f];
      //console.info('  -- found: '+ name);
      if (!exp.test(name.split('/').pop().split('.').pop())) {
        info.children[name] = _scanSync.call(K, absPath + '/' + name);
      }
    }
    
    // The current directory has been scanned;
    // if we found an index.html, use its attributes for the directory
    if (typeof info.children['index.html'] == 'object') {
      info.title = info.children['index.html'].title || info.title;
      info.children['index.html'].hidden = true;
    }
    
    if (!info.title && info.url == '/') {
      console.info('Site root reached');
    }
  }
  else {
    var analysed = {};
    
    // computing a hash might not be a so good idea
    //info.hash = crypto.createHash('sha1').update(info.content).digest('hex');
    info.mime = mime.lookup(absPath);
    
    //console.info('typeof parsers, typeof parsers[info.mime]', typeof parsers, typeof parsers[info.mime]);
    if (typeof parsers !== 'undefined' && typeof parsers[info.mime] == 'function') {
      // this is a file, we read its content
      info.content = fs.readFileSync(absPath).toString();
      
      try {
        info = _.extend({
          title: 'Missing title',
          regions: {
            main: 'Missing content'
          }
        }, info, parsers[info.mime](_.clone(info)));
        //delete info.content;
      } 
      catch (e) {
        info.title = 'Error';
        info.regions = {
          main: e.message
        };
      }
    }
    else {
      info = {};
    }
    
    try {
      analysed = K.analyse(info.content || '<div role="document-body">Unreadable content for '+ info.name +'</div>');
      /*
      //console.info("\n\n\n"+info.content+"\n");
      console.info(info.name +' => '+ info.mime, analysed);
      console.info("\n\n\n");
      */
      _.extend(info, analysed);
      info.title = info.title && info.title != 'undefined' ? info.title : info.name;
      delete info.content;
    } catch(e) {
      /*
      console.info("\n----------------------------------------\n\n");
      console.error(e);
      console.info('No possible analysis');
      console.info("\n\n----------------------------------------\n");
      */
    }
    
  }
  
  
  if (typeof info.title == 'undefined' || info.title == 'undefined') {
    info.hidden = true;
  }
  info.hidden = info.hidden || (!info.regions && !info.children);  
//  console.info('**** scanning ', info);
  return info;
};








//---------------------------------------------------------------------
// Exports
//---------------------------------------------------------------------

/**
 *  Function: fs.getFiles
 *  Fetches the tree structured representation of the content.
 *  
 *  Section: Server side
 *  
 *  Parameters:
 *    func - a callback
 */
exports.getFiles = function(cb) {
  var K = this;
  if (!require('./../kern').isKern(this)) {
    console.trace('Kern.fs.getFiles() called without Kern', path);
    return {};
  }
  
  try {
    //console.info("\n---------------------------------\n * "+ _.keys(K.routes).join("\n * "));
    try {
      K.files = _scanSync.call(K, K.contentDir());
    }
    catch (e) {
      console.error(path || K.contentDir(), e);
      
      K.files = {
        title:'Error',
        name:'',
        regions: {main: e.message},
        children:{},
        parents:[]
      };
    }
    //console.info("K.fs\n"+ _.keys(K.fs).join("\n"));
  }
  catch (e) {
    console.trace(e);
    console.info('fs/fs.js exports.getFiles K.fs', K.fs);
    return {};
  }
  if (typeof cb == 'function') cb.call(K);
};



//---------------------------------------------------------------------
// CSS
//---------------------------------------------------------------------



_.extend(exports, require('./css'));





//---------------------------------------------------------------------
// JS
//---------------------------------------------------------------------



_.extend(exports, require('./js'));




//---------------------------------------------------------------------
// Compression
//---------------------------------------------------------------------




