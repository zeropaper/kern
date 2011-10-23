
var Kern = require('./lib/kern').Kern;
var port = process.env.C9_PORT || 8080;
var kernApp = new Kern({
    contentDir:     __dirname +'/content'
  , cacheDir:       __dirname +'/cache'
  , publicDir:      __dirname +'/public'
  , port:           port
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
kernApp.compassWatch();
kernApp.serve();
// http://peter.sh/experiments/chromium-command-line-switches/
var exec = require('child_process').exec;
//exec("google-chrome --focus-existing-tab-on-open http://0.0.0.0:8080/#!/docs &");
//exec("google-chrome --incognito "+(kernApp.settings.asApp ? ' --app=' : '')+"http://0.0.0.0:8080");
