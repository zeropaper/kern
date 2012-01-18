var _ = require('underscore')._
  , fs = require('fs')
  , http = require('http')
  , url = require('url')
  , path = require('path')
  , child_process = require('child_process')
  , Inotify = false
  
//  , ffmpeg = require('./../../node_modules/node-fluent-ffmpeg')
;


exports.accept = /^(audio|video|image)\//i;



function isMedia(path, isMime) {
  return isVideo(path, isMime) || isAudio(path, isMime);
}

function isVideo(path, isMime) {
  return /^video\//i.test(isMime ? path : require('mime').lookup(path));
}

function isAudio(path, isMime) {
  console.info(path);
  return /^audio\//i.test(isMime ? path : require('mime').lookup(path));
}

function isImage(path, isMime) {
  return /^image\//i.test(isMime ? path : require('mime').lookup(path));
}

exports.parser = function(info, cb, postponed) {

  var CE = this
    , cmd = 'LANGUAGE=en extract --hash=sha1 "' + CE.absPath() + '"'
  ;
  K.log('info', 'content', 'Parsing media');
  
  info = info || {};
  info.meta = {};
  info.regions = info.regions || {};
  
  try {
    require('child_process').exec(cmd, function(error, stdout, stderr) {
      
      if (error) {
        CE.Kern.trigger('contentparsed', CE);
        info.regions = { main: 'Command monster failed<br/>'+ cmd };
        return (_.isFunction(cb) ? cb(error) : false);
      };
      
      //K.log('stdout.toString()', stdout.toString());
      _.each(stdout.toString().split("\n"), function(val, key, list) {
        var name = val.split(' - ').shift().toLowerCase()
          , value = val.split(' - ').pop()
        ;
        if (!name) return;
        if (name == 'size') {
          var parts = value.toLowerCase().split('x');
          list.width = info.meta.width = parts[0];
          list.height = info.meta.height = parts[1];
        }
        
        list[name] = info.meta[name] = value;
      });
      
      delete info[''];
      info.mime = info.meta.mimetype;
      delete info.meta.mimetype;
      
      info.regions = info.regions || {};
      info.regions.main = 'Screwed';
      
      if (!_.isArray(info.parents)) {
        CE.Kern.trigger('contentparsed', CE);
        info.regions.main = 'Has no parent';
        /*
        K.log('info has no parents', info, CE.parents);
        CE.set(info, {silent: !postponed});
        return;
        */
        return (_.isFunction(cb) ? cb(error) : false);
      }
      
      
      var body = ''
        , URL = info.parents.join('/') +'/'+ info.name
      ;
      
      
      if (isImage(info.mime, true)) {
        info.regions.main = '<img src="/i/same'+ URL +'" class="original" />';
      }
      else if (isVideo(info.mime, true)) {
        info.regions.main = K.render('html5-video-player', {
          url: URL,
          width: 320 * 1.25,
          height: 240 * 1.25,
          originalMime: info.mime,
          formats: {
            // mime: ext
            'video/webm': 'webm'
          , 'video/ogg': 'ogv'
          , 'video/mp4': 'mp4'
          },
          flashplayer: '<!-- no flash player fallback -->'
        });
      }
      else if (isAudio(info.mime, true)) {
        info.regions.main = K.render('html5-audio-player', {
          url: URL,
          originalMime: info.mime,
          formats: {
            // mime: ext
            'audio/mp3': 'mp3'
          , 'audio/ogg': 'oga'
          , 'audio/mp4': 'm4a'
          },
          flashplayer: '<!-- no flash player fallback -->'
        });
      }
      /*
      if (isMedia(info.mime, true)) {
        var ffmpegmeta = ffmpeg.Metadata;
        return ffmpegmeta.get(absPath, function(metadata) {
          metadata = _.extend({}, metadata, info);
          if (typeof cb == 'function') return cb(metadata);
        });
      }
      */
      CE.Kern.trigger('contentparsed', CE);
      return (_.isFunction(cb) ? cb(null, info) : info);
    });
    
  }
  catch (err) {
    CE.Kern.trigger('contentparsed', CE);
    info.regions = { main: 'Command epic failed<br/>'+ cmd };
    return (_.isFunction(cb) ? cb(err) : false);
  }
};