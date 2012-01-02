var _ = require('underscore')._
  , fs = require('fs')
  , http = require('http')
  , url = require('url')
  , path = require('path')
  , child_process = require('child_process')
  , Inotify = false
  
//  , ffmpeg = require('./../../node_modules/node-fluent-ffmpeg')
;
var procCount = 0;
var queue = [];
var current = '';
var runningQueue;



function queueAdd(context, info, cb) {
  queue.push({context: context, info: info, cb: cb});
//  K.log("Adding to queue "+ context.get('id'));
  if (!runningQueue) {
    runningQueue = setInterval(function(){
      var params = queue.pop();
      current = params.context.get('id');
      exports.parser.call(params.context, params.info, params.cb, false);
      if (!queue.length) return clearInterval(runningQueue);
    }, 10);
  }
}


exports.accept = /^(audio|video|image)\//i;



function isMedia(path, isMime) {
  return isVideo(path, isMime) || isAudio(path, isMime);
}

function isVideo(path, isMime) {
  return /^video\//i.test(isMime ? path : require('mime').lookup(path));
}

function isAudio(path, isMime) {
  return /^audio\//i.test(isMime ? path : require('mime').lookup(path));
}

function isImage(path, isMime) {
  return /^image\//i.test(isMime ? path : require('mime').lookup(path));
}

exports.parser = function(info, cb, postponed) {

  var CE = this
    , cmd = 'LANGUAGE=en extract --hash=sha1 "' + CE.absPath() + '"'
  ;

  if (procCount >= 5) {
    queueAdd(CE, info, cb);
    return {};
  }
  
  procCount++;
  
  info = info || {};
  info.meta = {};
  info.regions = info.regions || {};
  
  try {
    require('child_process').exec(cmd, function(error, stdout, stderr) {
      
      if (error) {
        CE.Kern.trigger('contentparsed', CE);
        info.regions = { main: 'Command monster failed<br/>'+ cmd +" <pre>"+ stdout +"</pre><pre>"+ stderr +"</pre>" };
        procCount--;
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
        procCount--;
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
        info.regions.main = _.template(CE.Kern.getTemplate('html5-video-player'), {
          _: _,
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
        info.regions.main = _.template(CE.Kern.getTemplate('html5-audio-player'), {
          _: _,
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
        procCount--;
        var ffmpegmeta = ffmpeg.Metadata;
        return ffmpegmeta.get(absPath, function(metadata) {
          metadata = _.extend({}, metadata, info);
          if (typeof cb == 'function') return cb(metadata);
        });
      }
      */
      CE.Kern.trigger('contentparsed', CE);
      procCount--;
      return (_.isFunction(cb) ? cb(null, info) : info);
    });
    
  }
  catch (err) {
    CE.Kern.trigger('contentparsed', CE);
    info.regions = { main: 'Command epic failed<br/>'+ cmd +" <pre>"+ stdout +"</pre><pre>"+ stderr +"</pre>" };
    procCount--;
    return (_.isFunction(cb) ? cb(error) : false);
  }
};