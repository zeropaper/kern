var Kern = require('./lib/kern').Kern;
var kernApp = new Kern({
    contentDir:     '/home/robert/DAV'
  , cacheDir:       __dirname +'/cache/DAV'
  , publicDir:      __dirname +'/public'
  , port:           8081
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
    , require('./lib/image/image')
    , require('./lib/av/av')
    , require('./lib/tunes/tunes')
  ]
});

kernApp.compassWatch();
kernApp.serve();

// http://peter.sh/experiments/chromium-command-line-switches/
var exec = require('child_process').exec;
//exec("google-chrome --focus-existing-tab-on-open http://0.0.0.0:8080/#!/docs &");
//exec("google-chrome --incognito "+(kernApp.settings.asApp ? ' --app=' : '')+"http://0.0.0.0:8080");
