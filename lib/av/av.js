var _ = require('underscore')._
  , k = require('./../kern')
  , fs = require('fs')
  , ffmpeg = require('./../../node_modules/node-fluent-ffmpeg')
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



function find(req, res) {
  var ps = req.params;
  console.info('find a file with', ps);
  if (ps.length < 1) return false;

  var short = '/'+ ps[0]
    , long = short +'.'+ ps[1]
  ;
  
  if (typeof K.paths[short] == 'object') {
    console.info('Found, short '+ short);
    return K.paths[short];
  }
  
  if (ps.length > 1 && typeof K.paths[long] == 'object') {
    console.info('Found, long '+ long);
    return K.paths[long];
  }
  
  for (var p in K.paths) {
    if (p.split(short) == 2) {
      return K.paths[p];
    }
  }
  
  if (ps.length > 1) {
    for (var p in K.paths) {
      if (p.split(long) == 2) {
        return K.paths[p];
      }
    }
  }
  
  return false;
};



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


function contentPath(path) {
  return path.split('?').shift().substr('/av'.length, path.length);
}


function transcode(req, res, next) {
  function dirname(path) {
    var parts = path.split('/');
    parts.pop();
    return parts.join('/');
  }
  
  var file = find(req, res)
    , p = require('path')
  ;
  
  if (!file) {
    console.error('Could not find a file with', req.params, 'in', _.keys(K.paths).join(', '));
    res.send(404);
    return;
  }
  
  var path = contentPath(req.url)
    , newExt = p.extname(path)
    , originalExt = p.extname(p.basename(path, newExt))
    , originalMime = mime.lookup(file.absPath())
    , newMime = mime.lookup(newExt)
    , absPath = file.absPath()
    , destination = (req.params.length > 1 && newExt == originalExt ? absPath : K.cacheDir() + file.get('url') + newExt)
    , exists = false
  ;
  
  
  console.info({
    orginalExt: originalExt
  , orginalMime: originalMime
  , absPath: absPath
  , newExt: newExt
  , newMime: newMime
  , destination: destination
  });
  try { var stats = fs.statSync(destination); exists = stats.isFile(); } catch (e) {}
  if (stats && newExt == originalExt) {
    res.sendfile(absPath, function(err){
      return;
    });
    return;
  }
  
  var convert = (req.query.convert || /(jpg|gif|png|json)/ig.test(newExt)) && newExt != orginalExt;
  if (newExt == '.json') {
    return fetchMeta(absPath, function(metadata){
      res.contentType('json');
      res.send(metadata);
    });
  }
  
  res.contentType(newMime);
  
  function sendOriginal() {
    
  }
  
  
  function sendCached() {
    
  }
  
  
  function sendConverted() {
    console.info("Ensure path: "+ dirname(destination));
    K.fs.recursMkdir(dirname(destination), 0777, function(err){
      if (err) {
        console.error('Could not create the directory: '+ dirname(destination));
        console.error(err);
        return next(err);
      }
      
      var proc = new ffmpeg(absPath);
      if (/\.(jpg|gif|png)/ig.test(newExt)) {
        console.info("Requested as image");
        proc.takeScreenshot({
          outputfile: destination,
          offset: 15
        }, function(err) {
          if (err) {
            console.error('Could not generate the screenshots');
            console.error(err);
            return next(err);
          }
          console.log('Screenshots were saved');
          res.sendfile(destination, function(err) {
            if (err) next(err);
          });
        });
      }
      else {
        console.info("Requested as new video");
        
        try {
          proc.usingPreset(newExt.substr(1, newExt.length));
        } 
        catch (e) {
          next(new Error('Could not use the ' + newExt + ' preset for transcoding'));
        }
        
        proc
          .renice(20)
          .saveToFile(destination, function(){
            res.sendfile(destination, function(err){ if(err) next(err); });
          })
        ;
      }
    });
  }
  
  if (convert) {
    console.info("A converted file is requested");
    
    return res.sendfile(destination, function(err){
      console.info("Sending "+ destination);
      if (err) {
        if (err.errno != 2) {
          console.error('The file might exists, but an other error happend');
          console.info(err);
          console.info('Request headers', req.headers);
          return next(err);
        }
        console.info(destination +' does not exist... yet');
        return sendConverted();
      }
    });
  }
  else {
    
    var proc = new ffmpeg(absPath);
    console.info('Streaming', proc.dumpCommand(), "\n\n - ****************** - \n\n");
    proc.writeToStream(res, function(retcode, err) {
      if (err) next(err);
      return res.end();
    });
    
  }
  
  //next(new Error('Can not determine what to do with the request'));
};










exports.extender = function() {
  var K = this;
  if (_.isUndefined(K.app)) return;
  
  var mejsDir = K.publicDir() +'/js/lib/mediaelement/build';
  
  K.app.get('/kern/av.common.js', function(req, res, next){res.sendfile(__dirname +'/av.common.js');});
  K.app.get('/kern/av.js', function(req, res, next){res.sendfile(mejsDir +'/mediaelement-and-player.min.js');});
//  K.app.get('/kern/av.css', function(req, res, next){res.sendfile(mejsDir +'/mediaelementplayer.css');});
  K.app.get('/kern/av.swf', function(req, res, next){res.sendfile(mejsDir +'/flashmediaelement.swf');});
  
  K.app.get('/av/*\.(jpg|mp4|webm|ogg|m4v|png|gif|flv|json|mp3|wav|aac|ogv|oga)', transcode);
  
  K.assets.scripts['/kern/av.js'] = {weight: -55};
  K.assets.scripts['/kern/av.common.js'] = {weight: -1};
  //K.assets.styles['/kern/av.css'] = {};
  K.assets.styles['/js/lib/mediaelement/build/mediaelementplayer.css'] = {};
  
  
  K.app.get('/player', function(req, res) {
    K.loadLayout();
    var analysed = K.analyse(fs.readFileSync(__dirname +'/templates.html').toString());
    var options = _.extend(analysed, {
      Kern: K,
    });
    K.apply(options);
    res.send(require(k.Kern.__dir +'/fs/delivery').fixHTML(K.$('html').html(), options));
  });
};
