var _ = require('underscore')._
  , fs = require('fs')
  , http = require('http')
  , url = require('url')
  , path = require('path')
  , child_process = require('child_process')
  , Inotify = false
;


exports.accept = /^(audio|video|image)\//i;



function isMedia(path, isMime) {
  if (!path) return false;
  return isVideo(path, isMime) || isAudio(path, isMime);
}

function isVideo(path, isMime) {
  if (!path) return false;
  var m = isMime ? path : require('mime').lookup(path);
  return (/ video\//i).test(m) || (/\/(3gpp|ogg|ogv|oga)$/i).test(m);
}

function isAudio(path, isMime) {
  if (!path) return false;
  return (/^audio\//i).test(isMime ? path : require('mime').lookup(path));
}

function isImage(path, isMime) {
  if (!path) return false;
  return (/^image\//i).test(isMime ? path : require('mime').lookup(path));
}

exports.isMedia = isMedia;
exports.isAudio = isAudio;
exports.isVideo = isVideo;
exports.isImage = isImage;

exports.parser = function(info, cb, postponed) {

  var CE = this
    , cmd = 'LANGUAGE=en extract --hash=sha1 "' + CE.absPath() + '"'
  ;
  
  info = info || {};
  info.meta = {};
  info.regions = info.regions || {};
  


//  try {
//    child_process.exec(cmd, function(error, stdout, stderr) {
//      
//      if (error) {
//        CE.Kern.trigger('contentparsed', CE);
//        info.regions = { main: 'Command monster failed<br/>'+ cmd };
//        return (_.isFunction(cb) ? cb(error) : false);
//      }
//      
//      
//      _.each(stdout.toString().split("\n"), function(val, key, list) {
//        var name = val.split(' - ').shift().toLowerCase()
//          , value = val.split(' - ').pop()
//        ;
//        if (!name) return;
//        if (name == 'size') {
//          var parts = value.toLowerCase().split('x');
//          list.width = info.meta.width = parts[0];
//          list.height = info.meta.height = parts[1];
//        }
//        
//        list[name] = info.meta[name] = value;
//      });
//      
//      delete info[''];
//      
//      info.regions = info.regions || {};
//      info.regions.main = '<!-- Screwed -->';
//      
//      var body = ''
//        , URL = CE.id;
//      ;
//
//      CE.Kern.trigger('contentparsed', CE);
//      return (_.isFunction(cb) ? cb(null, info) : info);
//    });
//    
//  }
//  catch (err) {
//    CE.Kern.trigger('contentparsed', CE);
//    info.regions = { main: 'Command epic failed<br/>'+ cmd };
//    return (_.isFunction(cb) ? cb(err) : false);
//  }
};