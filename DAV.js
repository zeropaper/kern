//this.ADMINCREDENTIALS = 'admin:secret';

var Kern = require('./lib/kern').Kern;
var kernApp = new Kern({
    contentDir:     '/home/robert/DAV'
  , cacheDir:       __dirname +'/cache/DAV'
  , publicDir:      __dirname +'/public'
  , port:           8080
  , hostname:       '0.0.0.0'
  , pageAtStart:    '/'
  , socketEnabled:  true
  , asApp:          true
  , session: {
      secret:  'we9dwed',
      key:     'kern.sid'
    }
  , appName:        'My first Kern'
  , extensions: [
      require('./lib/admin/admin')
    , require('./lib/editor/editor')
    , require('./lib/tap/tap')
    , require('./lib/av/av')
    , require('./examples/gmap/gmap')
  ]
});
/*
kernApp.check({
  'foo': function(){return this.commandExists('foo')},
  'ffmpeg': function(){return this.commandExists('ffmpeg')},
  'compass': function(){return this.commandExists('compass')},
  'extract': function(){return this.commandExists('extract')},
  '/usr/bin/ffmpeg': function(){return this.commandExists('/usr/bin/ffmpeg')},
  '/usr/bin/compass': function(){return this.commandExists('/usr/bin/compass')},
  '/usr/bin/extract': function(){return this.commandExists('/usr/bin/extract')}
}, console.info);
*/
kernApp.compassWatch();
kernApp.serve();
// http://peter.sh/experiments/chromium-command-line-switches/
var exec = require('child_process').exec;
//exec("google-chrome --focus-existing-tab-on-open http://0.0.0.0:8080/#!/docs &");
//exec("google-chrome --incognito "+(kernApp.settings.asApp ? ' --app=' : '')+"http://0.0.0.0:8080");
