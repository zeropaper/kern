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
  if (!path) return false;
  return isVideo(path, isMime) || isAudio(path, isMime);
}

function isVideo(path, isMime) {
  if (!path) return false;
  var m = isMime ? path : require('mime').lookup(path);
  return /video\//i.test(m) || /\/(3gpp|ogg|ogv|oga)$/i.test(m);
}

function isAudio(path, isMime) {
  if (!path) return false;
  return /audio\//i.test(isMime ? path : require('mime').lookup(path));
}

function isImage(path, isMime) {
  if (!path) return false;
  return /image\//i.test(isMime ? path : require('mime').lookup(path));
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
      // delete info.meta.mimetype;

      // CE.Kern.log('info', 'content', info.mime +' is Audio, Video, Image?', isAudio(info.mime, true), isVideo(info.mime, true), isImage(info.mime, true));
      
      info.regions = info.regions || {};
      info.regions.main = 'Screwed';
      
      // if (!_.isArray(info.parents)) {
      //   CE.Kern.trigger('contentparsed', CE);
      //   info.regions.main = 'Has no parent';
      //   K.log('error', 'content', 'media info has no parents', info, CE.parents);
      //   /*
      //   CE.set(info, {silent: !postponed});
      //   return;
      //   */
      //   return (_.isFunction(cb) ? cb(error) : false);
      // }
      
      
      var body = ''
        , URL = CE.id;//info.parents.join('/') +'/'+ info.name
      ;
      if (isImage(info.mime, true)) {
        // K.log('info', 'parsing', info.mime +' is image ', info);
        info.regions.main = '<img src="/i/same'+ URL +'" class="original" />';
      }
      else if (isVideo(info.mime, true)) {
        // K.log('info', 'parsing', info.mime +' is video ', info);
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
        // K.log('info', 'parsing', info.mime +' is audio ', info);
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

      // K.log('info', 'content', 'CE.Kern.rules', CE.Kern.rules);
      // if (_.isFunction(CE.Kern.rules.av)) {
      //   var main = CE.Kern.rules.av.call(CE, info, true, K);
      //   CE.Kern.log('info', 'content', 'Using AV rules for '+ info.mime, typeof main);
      //   info.regions.main = main;
      // }
      // else {
      //   CE.Kern.log('error', 'content', 'CE.Kern.rules.av could not be found');
      // }

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