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
http://diveintohtml5.org/video.html
## Theora/Vorbis/Ogg
you@localhost$ ffmpeg2theora --videobitrate 200 --max_size 320x240 --output pr6.ogv pr6.dv

## H.264/AAC/MP4
you@localhost$ HandBrakeCLI --preset "iPhone & iPod Touch" --vb 200 --width 320 --two-pass --turbo --optimize --input pr6.dv --output pr6.mp4

## VP8/Vorbis/WebM
you@localhost$ ffmpeg -pass 1 -passlogfile pr6.dv -threads 16  -keyint_min 0 -g 250 -skip_threshold 0 -qmin 1 -qmax 51 -i pr6.dv -vcodec libvpx -b 204800 -s 320x240 -aspect 4:3 -an -f webm -y NUL
you@localhost$ ffmpeg -pass 2 -passlogfile pr6.dv -threads 16  -keyint_min 0 -g 250 -skip_threshold 0 -qmin 1 -qmax 51 -i pr6.dv -vcodec libvpx -b 204800 -s 320x240 -aspect 4:3 -acodec libvorbis -ac 2 -y pr6.webm

<video id="movie" width="320" height="240" preload controls>
  <source src="pr6.webm" type='av/webm; codecs="vp8, vorbis"' />
  <source src="pr6.ogv" type='av/ogg; codecs="theora, vorbis"' />
  <source src="pr6.mp4" />
  <object width="320" height="240" type="application/x-shockwave-flash"
    data="flowplayer-3.2.1.swf"> 
    <param name="movie" value="flowplayer-3.2.1.swf" /> 
    <param name="allowfullscreen" value="true" /> 
    <param name="flashvars" value='config={"clip": {"url": "http://wearehugh.com/dih5/pr6.mp4", "autoPlay":false, "autoBuffering":true}}' /> 
    <p>Download video as <a href="pr6.mp4">MP4</a>, <a href="pr6.webm">WebM</a>, or <a href="pr6.ogv">Ogg</a>.</p> 
  </object>
</video>
<script>
  var v = document.getElementById("movie");
  v.onclick = function() {
    if (v.paused) {
      v.play();
    } else {
      v.pause();
    }
  };
</script>

*/









function fetchMeta(absPath, cb) {
  var cmd = 'LANGUAGE=en extract --hash=sha1 ' + absPath;
  require('child_process').exec(cmd, function(error, stdout, stderr) {
    var info = {};
    _.each(stdout.toString().split("\n"), function(val, key) {
      info[val.split(' - ').shift()] = val.split(' - ').pop();
    });
    var ffmpegmeta = ffmpeg.Metadata;
    ffmpegmeta.get(absPath, function(metadata) {
      _.extend(metadata, info);
      if (typeof cb == 'function') cb(metadata);
    });
  });
  return;
};


exports.extender = function() {
  var K = this;
  if (_.isUndefined(K.app)) 
    return;
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
  K.app.get(manipulator, function(req, res, next) {
    var
      params = _.clone(req.params),
      presetName = params.shift(),
      preset = K.settings.av.presets[presetName],
      original = params[1] || params[4],
      fromFormat = params[2] || params[5],
      toFormat = params[3] || false,
      generatedMime = toFormat ? mime.lookup(toFormat) : false,
      toImage = toFormat ? /^(image)\//.test(generatedMime) : false,
      file = K.paths[original]
    ;
    
    if (!file) return next(new Error('File "'+ original +'" not found'));
    if (!preset) preset = K.settings.av.presets.same;
    
    fs.stat(file.absPath(), function(err, stats) {
      if (err) return next(err);
      if (toFormat == '.json') {
        fetchMeta(file.absPath(), function(data){
          res.json(data);
        });
      }
      
      var generated = (K.cacheDir() +'/'+K.settings.av.prefix+'/'+ presetName + original) + (toFormat || '');
            
      return res.sendfile(toFormat ? generated : file.absPath(), function(err){
        if (err) {
          if (!toFormat) return next(new Error('Can not generate derivated.')); 
          
          
          K.fs.recursMkdir(path.dirname(generated), 0777, function(err){
            if (err) return next(err);
            
            
            var proc = new ffmpeg(file.absPath());
            if (toImage) {
              return proc.takeScreenshot({
                outputfile: generated,
                offset: 15
              }, function(err) {
                if (err) {
                  console.error('Could not generate the screenshot');
                  console.error(err);
                  return next(err);
                }
                res.sendfile(generated, function(err) {
                  if (err) return next(err);
                });
              });
            }
            
            
            
            var streamable = !/(m4v)/.test(generatedMime);
            console.info("Requested as new video");
            try {
              proc.usingPreset(toFormat.substr(1, toFormat.length));
            } 
            catch (e) {
              return next(new Error('Could not use the ' + toFormat + ' preset for transcoding'));
            }
            
            return streamable ? proc.writeToStream(res, function(retcode, err) {
                if (err) return next(err);
                return res.end();
              }) : proc
              .renice(20)
              .saveToFile(generated, function(){
                res.sendfile(generated, function(err){
                  if(err) return next(err);
                });
              })
            ;
            
            console.info("---------------\n",streamable,"\n----------------");
            return next(new Error("Not finished yet..."));
          });
        }
      });
    });
  });
  
  
  var mejsDir = K.publicDir() +'/js/lib/mediaelement/build';
  K.assets.styles['/kern/av.css'] = {
    filepath: mejsDir +'/mediaelementplayer.css',
    weight: -55
  };
  K.assets.styles['/js/lib/mediaelement/build/mediaelementplayer.css'] = {
    filepath: mejsDir +'/mediaelementplayer.css'
  };
  
  
  K.assets.scripts['/kern/av.common.js'] = {
    filepath: __dirname +'/av.common.js',
    weight: -1
  };
  K.assets.scripts['/kern/av.js'] = {
    filepath: mejsDir +'/mediaelement-and-player.min.js',
    weight: -55
  };
  
  K.assets.images = K.assets.images || {};
  K.assets.images['/js/lib/mediaelement/build/controls.png'] = {
    filepath: mejsDir +'/controls.png',
    weight: -55
  };
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
  
  /*
  K.app.get('/player', function(req, res) {
    K.loadLayout();
    var analysed = K.analyse(fs.readFileSync(__dirname +'/templates.html').toString());
    var options = _.extend(analysed, {
      Kern: K,
    });
    K.apply(options);
    res.send(require(k.Kern.__dir +'/fs/delivery').fixHTML(K.$('html').html(), options));
  });
  */
};
