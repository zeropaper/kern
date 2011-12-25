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
//  console.info("Adding to queue "+ context.get('id'));
  if (!runningQueue) {
    runningQueue = setInterval(function(){
      console.info("Running queue length "+ queue.length +" current "+ current);
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
    , cmd = 'LANGUAGE=en extract --hash=sha1 "' + CE.absPath().split(' ').join('\\ ').split('$').join('\\$') + '"'
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
        info.regions = { main: 'Command failed' };
        procCount--;
        /*
        console.error('Command '+ cmd +' failed', procCount);
        CE.set(info, {silent: !postponed});
        */
        return (_.isFunction(cb) ? cb(error) : false);
      };
      
      //console.info('stdout.toString()', stdout.toString());
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
        console.info('info has no parents', info, CE.parents);
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
          url: URL,
          width: 320 * 1.25,
          height: 240 * 1.25,
          flashplayer: '<!-- no flash player fallback -->'
        });//'<video><source src="/av/same'+ URL +'" type="'+info.mime+'" /></video>';
      }
      else if (isAudio(info.mime, true)) {
        info.regions.main = _.template(CE.Kern.getTemplate('html5-audio-player'), {
          url: URL,
          flashplayer: '<!-- no flash player fallback -->'
        });//'<audio><source src="/av/same'+ URL +'" type="'+info.mime+'" /></audio>';
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
      /*
      console.info('Process '+ cmd +' succeed', procCount);
      CE.set(info, {silent: !postponed});
      */
      return (_.isFunction(cb) ? cb(null, info) : info);
    });
    
  }
  catch (err) {
    CE.Kern.trigger('contentparsed', CE);
    info.regions = { main: 'Command failed' };
    procCount--;
    /*
    console.error('Process '+ cmd +' failed', procCount);
    CE.set(info, {silent: !postponed});
    */
    return (_.isFunction(cb) ? cb(error) : false);
  }
};