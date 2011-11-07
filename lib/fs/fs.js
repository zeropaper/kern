var _ = require('underscore')._
  , Backbone = require('../../node_modules/backbone/backbone')
  , crypto = require('crypto')
  , fs = require('fs')
  , mime = require('mime')
;
mime.define({
  'text/plain': ['md', 'markdown']
//  , 'application/x-woff': ['woff']
});


var escapeshellarg = function(arg) {
  // return '"'+arg.replace(/(["\s'$`\\])/g,'\\$1')+'"';
  return arg.replace(/(["\s'!\[\]\(\)&$`\\])/g,'\\$1');
};
exports.escapeshellarg = escapeshellarg;



var childProcessTask = Backbone.Model.extend({
  url: function(){},
  save: function(){},
  defaults: {
    url: function(){},
    callback: function(){console.error('Missing callback for ', this);},
    subject: {},
    arguments: [],
    priority: 0
  },
  validate: function(attrs) {
    if (!_.isFunction(attrs.callback) || !_.isArray(attrs.arguments)) return "Not a valid task";
  },
  initialize: function(attributes, options) {
    var self = this;
    self.bind('add', function(added) {
      console.info('A task has been added, the queue is now '+ self.collection.length +' long');
      self.collection.doIt();
    });
  },
  doIt: function() {
    var done = this.get('callback').apply(this.get('subject'), this.get('arguments'));
    this.destroy();
    return true;
  },
  processing: false
});

var childProcesses = Backbone.Collection.extend({
  model: childProcessTask,
  url: function(){},
  comparator: function(task) {return task.get('priority');},
  initialize: function(tasks, options) {
    
  },
  doIt: function() {
    var self = this;
    console.info('Doing the queue');
    var current = this.at(0);
    if (!current) return;
    self.processing = true;
    current.doIt();
    if (self.length) {
      setTimeout(function(){
        self.doIt();
      }, 500);
    }
    else {
      self.processing = false;
    }
  },
  processing: false
});

var childProcessesQueue = new childProcesses();








/**
 * Offers functionality similar to mkdir -p
 *
 * Asynchronous operation. No arguments other than a possible exception
 * are given to the completion callback.
 * 
 * adapted from http://unfoldingtheweb.com/2010/12/15/recursive-directory-nodejs/
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
  directory.split('//').join('/');
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









//---------------------------------------------------------------------
// Exports
//---------------------------------------------------------------------

exports.recursMkdir = mkdir_p;

exports.metadata = function(file, cb) {
  var K = this;// should be a model instead
  var absPath = typeof file.get == 'function' ? file.absPath() : file;
  
  if (typeof cb == 'function') cb.call(k, metadata);
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


