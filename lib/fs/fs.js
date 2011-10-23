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



/**
 * Offers functionality similar to mkdir -p
 *
 * Asynchronous operation. No arguments other than a possible exception
 * are given to the completion callback.
 * 
 * taken from http://unfoldingtheweb.com/2010/12/15/recursive-directory-nodejs/
 */
function mkdir_p(path, mode, callback, position) {
  mode = mode || 0777;
  position = position || 0;
  var parts = require('path').normalize(path).split('/')
    , abs = path.substr(0, 1) == '/'
  ;
  
  if (position >= parts.length) {
    if (callback) {
      return callback();
    }
    else {
      return true;
    }
  }
  
  var directory = (abs ? '/' : '') + parts.slice(0, position + 1).join('/');
  fs.stat(directory, function(err) {
    if (err === null) {
      mkdir_p(path, mode, callback, position + 1);
    }
    else {
      fs.mkdir(directory, mode, function(err) {
        if (err) {
          if (callback) {
            console.info('recursMkdir(), Could not create directory: '+ directory +' for position '+ (position + 1));
            return callback(err);
          }
          else {
            throw err;
          }
        }
        else {
          mkdir_p(path, mode, callback, position + 1);
        }
      })
    }
  })
}

_.extend(exports, require('./../common/methods').fs);




//---------------------------------------------------------------------
// File system
//---------------------------------------------------------------------

function mediaParser(info, cb) {
  var CE = this
    , cmd = 'LANGUAGE=en extract --hash=sha1 ' + CE.absPath()
  ;
  
  require('child_process').exec(cmd, function(error, stdout, stderr) {
    if (error) {
      CE.set({
        hidden: true,
        title: 'Error',
        regions: {
          main: 'An error occured while extracting meta information from <em>'+CE.absPath()+'</em>:<br/>'+ error.message
        }
      }, {silent: true});
      return;//throw error;
    }
    
    _.each(stdout.toString().split("\n"), function(val, key) {
      info[val.split(' - ').shift()] = val.split(' - ').pop();
    });
    delete info[''];
    
    var body = ''
      , URL = info.parents.join('/') +'/'+ info.name
    ;
    if (/^image\//ig.test(info.mime)) {
      body = '<img src="'+ URL +'" />';
    }
    else if (/^video\//ig.test(info.mime)) {
      body = '<video><source src="'+ URL +'" type="'+info.mime+'" /></video>';
    }
    else if (/^audio\//ig.test(info.mime)) {
      body = '<audio><source src="'+ URL +'" type="'+info.mime+'" /></video>';
    }
    else {
      body = 'Screwed';
    }
    
    CE.set({
      hidden: true,
      regions: {
        main: body
      }
    }, {silent: true});
    //console.info('Analysed', CE.toJSON());
  });
};

var parsers = exports.parsers = {
  'video/x-ms-wmv': mediaParser,
  'image/jpeg': mediaParser,
  'image/jpg': mediaParser,
  'image/png': mediaParser,
  'image/gif': mediaParser,
  'application/x-shockwave-flash': mediaParser,
  
  'text/html': function(info) {
    var CE = this;
    fs.readFile(CE.absPath(), function(err, data){
      if (err) throw err;
      CE.set(K.analyse(data.toString()), {silent: true});
    });
  },
  'text/plain': function(info, cb) {
    var CE = this
      , content = ''
    ;
    fs.readFile(info.absPath, function (err, data) {
      if (err) throw err;
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
        //console.info('', content);
        CE.set(K.analyse(content), {silent: true});
      }
      catch (e) {
        // console.error(e);
        CE.set({
          title: 'Parsing error',
          regions: {
            main: e.message
          }
        });
      }
      
    });
  }
};









//---------------------------------------------------------------------
// Exports
//---------------------------------------------------------------------

exports.recursMkdir = mkdir_p;

exports.metadata = function(file, cb) {
  var K = this;// should be a model instead
  var absPath = typeof file.get == 'function' ? file.absPath() : file;
  
  if (typeof cb == 'function') cb.call(k, metadata);
  /*
  var cmd = 'LANGUAGE=en extract --hash=sha1 '+ absPath;
  require('child_process').exec(cmd, function(error, stdout, stderr){
    console.info(error, stdout, stderr);
    var info = {};
    _.each(stdout.toString().split("\n"), function(val, key){
      info[val.split(' - ').shift()] = val.split(' - ').pop();
    });
    
    var ffmpegmeta = ffmpeg.Metadata;

    // make sure you set the correct path to your video file
    ffmpegmeta.get(absPath, function(metadata) {
      _.extend(info, metadata);
      console.log(require('util').inspect(metadata, false, null));
      
      res.contentType('json');
      res.send(_.extend({
        path: path
      }, error ? error : _.extend(info, stats)));
    });
  });
  */
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

//---------------------------------------------------------------------
// File fetching
// from
// http://www.jezra.net/blog/file_downloader_in_Nodejs_that_handles_redirects
// var Downloader = require('./Downloader'); 
// var dl = new K.fs.Downloader(); 
// dl.set_remoteFile('http://traffic.libsyn.com/ratholeradio/RR048_20_03_11.ogg'); 
// dl.run();
//---------------------------------------------------------------------

var path = require('path');
var url = require('url');
var http = require('http');
var fs = require('fs');

//create the downloader 'class'
var Downloader = function() {
  var self = this;
  var writeFile;
  //what global variable do we have?
  var complete = false;
  var contentLength = 0;
  var downloadedBytes = 0;
  var remoteFile;
  var localFile;
  var cb = function(file){console.info('File downloaded: '+ file);};
  var args = _.toArray(arguments);
  console.info('Initializing downloader with ', args);
  if (args.length) {
    if (_.isString(args[0])) {
      remoteFile = args[0];
    }
    if (_.isString(args[1])) {
      localFile = args[1];
    }
    else if (_.isFunction(args[1])) {
      cb = args[1];
    }
    if (!_.isFunction(args[1]) && _.isFunction(args[2])) {
      cb = args[2];
    }
  }
  
  self.setRemote = function(newRemote) {
    remoteFile = newRemote;
  };
  self.setLocal = function(newLocal) {
    localFile = newLocal;
  };
  
  self.run = function() {
    //start the download
    if (!remoteFile) throw new Error('No file to download');
    if (!localFile) {
      localFile = '/tmp/'+ _.uniqueId('download');
    }
    self.download( remoteFile, localFile, 0 );
  }

  self.download = function(remote, local, num) {
    console.log( remote );
    if ( num > 10 ) {
      console.log( 'Too many redirects' );
      throw new Error('Too many redirect for '+ remoteFile);
      return;
    }
    //remember who we are
    var self = self;
    //set some default values  
    var redirect = false;
    var newRemote = null;
    var writeToFile = false;
    var writeFileReady = false;
    //parse the url of the remote file
    var u = url.parse(remote);
    //set the options for the 'get' from the remote file
    var opts = {
      host: u.hostname,
      port: u.port,
      path: u.pathname
    };
    //get the file
    var request = http.get(opts, function(response ) {
      switch(response.statusCode) {
        case 200:
          //self is good
          //what is the content length?
          contentLength = response.headers['content-length'];
          break;
        case 302:
          newRemote = response.headers.location;
          self.download(newRemote, localFile, num+1 );
          return;
          break;
        case 404:
          console.log("File Not Found");
        default:
          //what the hell is default in this situation? 404?
          request.abort();
          return;
      }
      response.on('data', function(chunk) {
        //are we supposed to be writing to file?
        if(!writeFileReady) {
          //set up the write file
          writeFile = fs.createWriteStream(localFile);
          writeFileReady = true;
        }
        writeFile.write(chunk);
        downloadedBytes+=chunk.length;
        percent = parseInt( (downloadedBytes/contentLength)*100 );
        //console.log('('+ downloadedBytes +' / '+ contentLength + ') * 100 = '+ percent );
      });
      response.on('end', function() {
        complete = true;
        writeFile.end();
        cb(localFile);
      });
    });
    request.on('error', function(e) {
      console.log("Got error: " + e.message);
    });
  }
}
exports.Downloader = Downloader;


