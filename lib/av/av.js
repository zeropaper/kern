var _ = require('underscore')._
  , k = require('./../kern')
  , fs = require('fs')
  , ffmpeg = require('./../../node_modules/node-fluent-ffmpeg')
  , im = require('imagemagick')
  , path = require('path')
  , url = require('url')
  , mime = require('mime')
;

/*
http://diveintohtml5.net/video.html
## Theora/Vorbis/Ogg
you@localhost$ ffmpeg2theora --videobitrate 200 --max_size 320x240 --output pr6.ogv pr6.dv

## H.264/AAC/MP4
you@localhost$ HandBrakeCLI --preset "iPhone & iPod Touch" --vb 200 --width 320 --two-pass --turbo --optimize --input pr6.dv --output pr6.mp4

## VP8/Vorbis/WebM
you@localhost$ ffmpeg -pass 1 -passlogfile pr6.dv -threads 16  -keyint_min 0 -g 250 -skip_threshold 0 -qmin 1 -qmax 51 -i pr6.dv -vcodec libvpx -b 204800 -s 320x240 -aspect 4:3 -an -f webm -y NUL
you@localhost$ ffmpeg -pass 2 -passlogfile pr6.dv -threads 16  -keyint_min 0 -g 250 -skip_threshold 0 -qmin 1 -qmax 51 -i pr6.dv -vcodec libvpx -b 204800 -s 320x240 -aspect 4:3 -acodec libvorbis -ac 2 -y pr6.webm
*/



exports.extensionName = 'KernAV';


var presets = {
  
  webm: function(ffmpeg) {
    ffmpeg
      .toFormat('webm')
    ;
    return ffmpeg;
  },
  
  
  mp4: function(ffmpeg) {
    ffmpeg
      .toFormat('mp4')
    ;
    return ffmpeg;
  },
  
  
  ogv: function(ffmpeg) {
    ffmpeg
      .toFormat('ogv')
    ;
    return ffmpeg;
  },
  
  
  flv: function(ffmpeg) {
    ffmpeg
      .toFormat('flv')
      .updateFlvMetadata()
      //.withSize('320x?')
      .withVideoBitrate('512k')
      .withVideoCodec('libx264')
      .withFps(24)
      .withAudioBitrate('96k')
      .withAudioCodec('libfaac')
      .withAudioFrequency(22050)
      .withAudioChannels(2)
    ;
      //.addOptions([ '-vpre superfast' ]);
    return ffmpeg;
  }
};


function onTranscoding(file, preset, toFormat, streamable) {
  K.notify('transcoding', {
    preset: preset,
    toFormat: toFormat,
    streamable: streamable,
    id: file.id
  });
  K.log('av', (streamable ? 'Streamed transcoding' : 'Transcoding') +' of '+ file.id +' to '+ toFormat +' started.');
}
function onTranscoded(file, preset, toFormat, streamable) {
  K.notify('transcoded', {
    preset: preset,
    toFormat: toFormat,
    streamable: streamable,
    id: file.id
  });
  K.log('av', (streamable ? 'Streamed transcoding' : 'Transcoding') +' of '+ file.id +' to '+ toFormat +' ended.');
}
function onTranscodingFail(file, preset, toFormat, streamable) {
  K.notify('transcodingfail', {
    preset: preset,
    toFormat: toFormat,
    streamable: streamable,
    id: file.id
  });
  K.log('av', (streamable ? 'Streamed transcoding' : 'Transcoding') +' of '+ file.id +' to '+ toFormat +' failed.');
}




function fetchMeta(absPath, cb) {
  try {
    // var cmd = 'LANGUAGE=en extract --hash=sha1 ' + absPath.split(' ').join('\\ ');
    var cmd = 'LANGUAGE=en extract --hash=sha1 ' + absPath.split(' ').join('\\ ').split('$').join('\\$') +'';
    require('child_process').exec(cmd, function(error, stdout, stderr) {
      var info = {};
      _.each(stdout.toString().split("\n"), function(val, key) {
        info[val.split(' - ').shift()] = val.split(' - ').pop();
      });
      var ffmpegmeta = ffmpeg.Metadata;
      return ffmpegmeta.get(absPath, function(metadata) {
        metadata = _.extend({}, metadata, info);
        if (typeof cb == 'function') return cb(metadata);
      });
    });
  }
  catch (e) {
    K.log('error', e);
  }
};

function CEisAV(CE) {
  return !CE.isDir()
  && (
      (
        CE.has('mime')
        && /$(audio|video)\//i.test(CE.get('mime'))
      ) 
      || 
      (
        CE.absPath()
        && /^\.(mov|avi|mkv|ogg|ogv|mp4|wmv|rm|3gp)$/i.test(path.extname(CE.absPath()))
      )
    )
  ;
}

function transcode(req, res, next) {
  var
    params = _.clone(req.params),
    presetName = params.shift(),
    preset = K.settings.av.presets[presetName],
    original = params[1] || params[4],
    fromFormat = params[2] || params[5],
    toFormat = params[3] || false,
    generatedMime = toFormat ? mime.lookup(toFormat) : false,
    toImage = toFormat ? /^(image)\//.test(generatedMime) : false,
    file = K.paths[original],
    exactSame = (!toFormat || fromFormat == toFormat) && (!presetName || presetName == 'same')
  ;
  if (!file)return next(new K.errors.NotFound("Can not find "+ original +" in "+ _.keys(K.paths || {}).join(', ')));
  if (!_.isFunction(file.isDir)) return next(new K.errors.InternalServerError(""+ original +" is not a model")); 
  if (file.isDir()) return next(new K.errors.InternalServerError(""+ original +" is a directory")); 
  if (!CEisAV(file)) return next(new K.errors.InternalServerError(""+ original +" is not a media")); 
  
  K.log('av', 'debug', 'File '+ file.absPath(), 'to format '+ toFormat, 'to image', toImage);
  
  if (exactSame) {
    K.log('av', 'info', "--- Sending original file "+ file.absPath());
    // return;
    return res.sendfile(file.absPath(), function(err){
      if (err) return next(err);
      return;
    });
  }
  else if (toFormat == '.json') {
    return fetchMeta(file.absPath(), function(data){
      res.json(data);
    });
  }
  
  if (!preset) preset = K.settings.av.presets.same;
  var generated = (K.cacheDir() +'/'+K.settings.av.prefix+'/'+ presetName + original) + (toFormat || '');
        
  return res.sendfile(toFormat ? generated : file.absPath(), function(err){
    if (err) {
      if (!toFormat) return next(new Error('Can not generate derivated.')); 
      
      
      return K.fs.recursMkdir(path.dirname(generated), 0777, function(err){
        if (err) return next(err);
        
        var input = file.absPath();//K.fs.escapeshellarg(file.absPath());
        var output = generated;//K.fs.escapeshellarg(generated);
        K.log('av', "-- FFMPEG input path:\n"+ input);
        var proc = new ffmpeg(input);
        if (toImage) {
          return proc.takeScreenshot({
            outputfile: output,
            offset: 15
          }, function(err) {
            if (err) return next(err);//throw err;

            res.sendfile(generated, function(err) {
              if (err) K.log('av', "Error while generating images from:\n"+ input, err);
              K.log('av', "Generated image file sent ", generated);
            });
          });
        }
        
        
        K.trigger('transcoding', file, preset, toFormat, proc._isStreamable);
        try {

          K.log('av', 'debug', "Requested as "+ toFormat.substr(1, toFormat.length) +" "+ (proc._isStreamable ? "stream" : "transcoding"));
          presets[toFormat.substr(1, toFormat.length)](proc);
          

          var out = proc._isStreamable
            ? proc
              .writeToStream(res, function(retcode, err) {
                K.log('av', 'Proc %o', proc);
                K.log('av', 'Streaming '+ original +' to format '+ toFormat +" return code "+ retcode);
              })
            : proc
              .renice(10)
              .saveToFile(generated, function(retcode, error){
                if (!retcode) {
                  K.log('av', 'Converted '+ original +' to format '+ toFormat, retcode);
                  res.sendfile(generated, function(err){
                    if (err) K.log('av', "Error while generating derivate from:\n"+ input, err);
                    K.log('av', 'Sent converted '+ original);
                  });
                }
                else {
                  K.log('error', 'Could not convert '+ original +' to format '+ toFormat, retcode, error);
                }
              })
          ;
        }
        catch (e) {
          K.trigger('transcodingfail', file, preset, toFormat, proc._isStreamable);
          next(e);
        }
      });
    }
  });

}

exports.extender = function() {
  var K = this;
  if (_.isUndefined(K.app)) 
    return;
  
  /*
  K.bind('contentprepare', function(CE){
    if (!CEisAV(CE)) return;
    K.log('info', 'av', CE.absPath() +' is an audio/video media');
    fetchMeta(CE.absPath(), function(metadata){
      CE.set({meta: metadata}, {silent: true});
    });
  });
  */
  
  K.bind('transcoding', onTranscoding);
  K.bind('transcoded', onTranscoded);
  
  K.settings.av = {
    prefix: 'av'
  , presets: {
      same: [],
      iPad: [
          '-s'
        , '1024x768'
      ],
      iPhone: [
          '-s'
        , '480x320'
      ],
      iPhoneRetina: [
          '-s'
        , '960x640'
      ],
      // HTC Desire...
      '800x480': [
          '-s'
        , '800x480'
      ]
    }
  };
    
  var manipulator = new RegExp('/'+K.settings.av.prefix+'/([^/]+)((/.+([.]{1,1}[a-zA-Z0-9]+))([.]{1,1}[a-zA-Z0-9]+)|(/.+([.]{1,1}[a-zA-Z0-9]+)))');
  K.app.get(manipulator, transcode);
  
  
  var mejsDir = K.publicDir() +'/js/lib/mediaelement/build';
  K.assets.styles['/kern/av.css'] = {
    filepath: mejsDir +'/mediaelementplayer.css',
    weight: -55
  };
  K.assets.styles['/js/lib/mediaelement/build/mediaelementplayer.css'] = {
    filepath: mejsDir +'/mediaelementplayer.css'
  };
  
  
  K.assets.scripts['/kern.av.js'] = {
    filepath: __dirname +'/av.common.js',
    weight: -1
  };
  K.assets.scripts['/kern/av.js'] = {
    filepath: mejsDir +'/mediaelement-and-player.js',
    weight: -55
  };
  
  K.assets.images = K.assets.images || {};
  // K.assets.images['/js/lib/mediaelement/build/controls.png'] = {
  //   filepath: mejsDir +'/controls.png',
  //   weight: -55
  // };
  K.assets.images['/kern/controls.png'] = {
    filepath: mejsDir +'/controls.png',
    weight: -55
  };
  
  K.assets.flash = K.assets.flash || {};
  K.assets.flash['/kern/av.swf'] = {
    filepath: mejsDir +'/flashmediaelement.swf'
  };
  
  K.assets.templates = K.assets.templates || {};
  K.assets.flash['av-audio-player'] = {
    html: '<h2></h2>'
  };
  
  // K.app.get('/player', function(req, res) {
  //   K.loadLayout();
  //   var analysed = K.analyse(fs.readFileSync(__dirname +'/templates.html').toString());
  //   var options = _.extend(analysed, {
  //     Kern: K,
  //   });
  //   K.apply(options);
  //   res.send(require(k.Kern.__dir +'/fs/delivery').fixHTML(K.$('html').html(), options));
  // });
};
