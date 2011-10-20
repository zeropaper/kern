var http = require('http');
var sys = require('sys');
var child = require('child_process');
var express = require('express'),
  ffmpeg = require('../lib/fluent-ffmpeg');

var app = express.createServer();

app.use(express.static(__dirname + '/flowplayer'));

app.get('/', function(req, res) {
  res.send('index.html');
});

app.get('/video/:filename', function(req, res) {
  res.contentType('flv');
  // make sure you set the correct path to your video file storage
  var pathToMovie = '/path/to/storage/' + req.params.filename; 
  var proc = new ffmpeg(pathToMovie)
    // use the 'flashvideo' preset (located in /lib/presets/flashvideo.js)
    .usingPreset('flashvideo')
    // save to stream
    .writeToStream(res, function(retcode, error){
      console.log('file has been converted succesfully');
    });
});

app.listen(4000);

http.createServer(function (req, res) {
    res.writeHead(200, {
      'Content-Type': 'video/mp4'
    , 'Content-Transfer-Encoding': 'binary'
    , 'Content-Disposition': 'inline'
    });
    var parts = req.url.split('/');
    var name = parts.pop();
    var path = parts.join('/');
    var parts = name.split('.');
    var ext = parts.pop();
    name = parts.join('.');
    
    console.info("\nRequested video "+ (path+'/'+name+'.'+ext));
    
    
    im = child.spawn('ffmpeg', [
        '-y'
      , '-i'
      , path +'/'+ name +'.'+ ext
      , path +'/'+ name +'.mp4'
//      , ' - 2>/dev/null'
    ]);
    im.stdout.on('data', function(data) {
      console.info(data.toString());
      //res.write(data);
    });
    im.stderr.on('data', function(data) {
      //res.write(data);
      //console.log(data.toString());
    });
    im.on('exit', function (code, signal) {
      res.end();
    });
//    req.connection.pipe(im.stdin);
}).listen(8080);
/*
var sys = require('sys');
var exec = require('child_process').exec;


var spawn = require('child_process').spawn,
    ffmpeg  = spawn('ffmpeg',['-y', '-i', '/home/robert/Téléchargements/rileyhd3.wmv', '/home/robert/Téléchargements/rileyhd3.mp4']);

console.log('Spawned child pid: ' + ffmpeg.pid);
//ffmpeg.stdin.end();

ffmpeg.stdout.on('data', function (data) {
  console.log('stdout: ' + data);
});
ffmpeg.stderr.on('data', function (data) {
  console.log('stderr: ' + data);
});

ffmpeg.on('exit', function (code, signal) {
  console.log('child process exited with code ' + code);
});
/*
exec("vlc -vvv /home/robert/Téléchargements/rileyhd3.wmv --sout udp:192.168.0.42 --ttl 12", function(error, stdout, stderr) {
  console.info(' -------------- ');
  console.error(error);
  console.info(' -- -- -- -- -- ');
  console.error(stderr);
  console.info(stdout);
  console.info(' -------------- ');
});
*/