var _ = require('underscore')._
  , fs = require('fs')
  , http = require('http')
  , url = require('url')
  , path = require('path')
  , child_process = require('child_process')
  , Inotify = false
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

exports.accept = /^(audio|video|image)/\/i;


exports.parser = function(info, cb, postponed) {
//  console.info(this.attributes);
  var CE = this
    // , cmd = 'LANGUAGE=en extract --hash=sha1 ' + CE.absPath().split(' ').join('\\ ')
    , cmd = 'LANGUAGE=en extract --hash=sha1 "' + CE.absPath().split(' ').join('\\ ').split('$').join('\\$') + '"'
  ;
  if (procCount >= 5) {
//    console.info("Postponing parsing "+procCount+"\n"+ cmd);
    
    queueAdd(CE, info, cb);
    
    /*
    setTimeout(function(){
      console.info("Postponed parsing execution "+procCount+"\n"+ cmd);
//      exports.parser.call(CE, info, cb, true);
    }, procCount * 20);
    */
    return {};
  }
  procCount++;
  info = info || {};
  info.meta = {};
  info.regions = info.regions || {};
  try {
    require('child_process').exec(cmd, function(error, stdout, stderr) {
      
      if (error) {
        console.error('Command '+ cmd +' failed', procCount);
        CE.Kern.trigger('contentparsed', CE);
        info.regions = { main: 'Command failed' };
        CE.set(info, {silent: !postponed});
        procCount--;
        return;
      };
      
      console.info('stdout.toString()', stdout.toString());
      _.each(stdout.toString().split("\n"), function(val, key, list) {
        var name = val.split(' - ').shift().toLowerCase()
          , value = val.split(' - ').pop()
        ;
        if (!name) return;
        console.info('name, value', "'"+name+"'", "'"+value+"'");
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
        CE.set(info, {silent: !postponed});
        procCount--;
        return;
      }
      
      
      var body = ''
        , URL = info.parents.join('/') +'/'+ info.name
      ;
      
      
      if (/^image\//i.test(info.mime)) {
        info.regions.main = '<img src="/i/same'+ URL +'" class="original" />';
      }
      else if (/^video\//i.test(info.mime)) {
        info.regions.main = '<video><source src="/av/same'+ URL +'" type="'+info.mime+'" /></video>';
      }
      else if (/^audio\//i.test(info.mime)) {
        info.regions.main = '<audio><source src="/av/same'+ URL +'" type="'+info.mime+'" /></audio>';
      }

      CE.Kern.trigger('contentparsed', CE);
      CE.set(info, {silent: !postponed});
      procCount--;
      console.info('Process '+ cmd +' succeed', procCount);
    });
    
  }
  catch (err) {
    console.error('Process '+ cmd +' failed', procCount);
    CE.Kern.trigger('contentparsed', CE);
    info.regions = { main: 'Command failed' };
    CE.set(info, {silent: !postponed});
    procCount--;
  }
};