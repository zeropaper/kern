var Kern = require('./lib/kern').Kern;

var port = process.env.C9_PORT || 8080;

var kernApp = new Kern({

    // The directory where your content is,
    // supported content files (almost everything) will be scanned
    contentDir:     __dirname +'/content'

    // A directory where Kern can save some generated files like
    // converted videos, resized images..
  , cacheDir:       __dirname +'/cache'

    // This not properly speaking a public directory, rather a 
    // directory where the files used for the look&feel of
    // the site are stored
  , publicDir:      __dirname +'/public'
  
  
  , port:           port
  , hostname:       '0.0.0.0'

  , pageAtStart:    '/'
  
  , socketEnabled:  true
  
  // if that parameter is set to true, Kern will attempt to make a 
  // offline browsable web app
  , asApp:          true
  
  // the name of the site / app
  , appName:        'Kern.js'
  
  // enables session support
  , session: {
      secret:  'we9dwed',
      key:     'kern.sid'
    }
  
  
  //, extensionsDir:  __dirname +'/modules'
  
  // Loading some Kern extensions
  , extensions: [
      require('./lib/admin/admin')
    , require('./lib/image/image')
    , require('./lib/av/av')
    , require('./lib/editor/editor')
  ]
  
});

kernApp.compassWatch();

kernApp.serve();



// http://peter.sh/experiments/chromium-command-line-switches/
//var exec = require('child_process').exec;
//exec("google-chrome --incognito "+(kernApp.settings.asApp ? ' --app=' : '')+"http://0.0.0.0:8080");
