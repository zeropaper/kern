var Kern = require(__dirname+'/../kern').Kern;

var port = process.env.C9_PORT || 38080;

var kernApp = new Kern({

    // The directory where your content is,
    // supported content files (almost everything) will be scanned
    _contentDir:     __dirname +'/../../content'
   
    // A directory where Kern can save some generated files like
    // converted videos, resized images..
  , _cacheDir:       __dirname +'/../../cache'

    // This not properly speaking a public directory, rather a
    // directory where the files used for the look&feel of
    // the site are stored
  , _publicDir:      __dirname +'/../../public'


  // obvious settings
  , port:           port
  , hostname:       '0.0.0.0'


  , pageAtStart:    '/'

  // in order to have real-time change propagation,
  // you'll need to enable the websocket support
  , socketEnabled:  true

  // if that parameter is set to true, Kern will attempt to make a
  // offline browsable web app
  , asApp:          true

  // the name of the site / app
  , appName:        'Kern.js'

  // enables session support
  , _session: {
      secret:  'we9dwed',
      key:     'kern.sid'
    }
 
  , _crawlMaxDepth: 20

  //, extensionsDir:  __dirname +'/modules'

  // Loading some Kern extensions
  , extensions: [
      require('./../content/content')
    , require('./../image/image')
    , require('./../av/av')
    , require('./../watcher/watcher')
    , require('./../socket/socket')
    , require('./drupal')
  ]
  
  // extension configuration
  , drupal: {
    _server: {
      installPath: '/var/aegir/platforms/atrium-1.2'
    },
    someCommonVariable: 'OK!'
  }
});


// if you have compass installed on the machine
// you can watch for changes in your scss/sass files
// (this is not using the "compass watch"
// command but behaves the save)
kernApp.compassWatch();


// finally, start listenning / serve pages
kernApp.serve();

//console.info('kernApp.toJSON()',kernApp.toJSON());

// http://peter.sh/experiments/chromium-command-line-switches/
//var exec = require('child_process').exec;
//exec("google-chrome --incognito "+(kernApp.settings.asApp ? ' --app=' : '')+"http://0.0.0.0:8080");
