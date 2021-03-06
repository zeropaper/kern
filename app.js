var Kern = require(__dirname+'/lib/kern').Kern;

var port = process.env.C9_PORT || 8080;

var kernApp = new Kern({

    // The directory where your content is,
    // supported content files (almost everything) will be scanned
   // contentDir:     __dirname +'/content'
//    contentDir:     '/media/Windows7_OS/Documents and Settings/robert/Music/'
    contentDir:     __dirname +'/projects/KernDocs'

    // A directory where Kern can save some generated files like
    // converted videos, resized images..
  , cacheDir:       __dirname +'/cache'

    // This not properly speaking a public directory, rather a
    // directory where the files used for the look&feel of
    // the site are stored
  , publicDir:      __dirname +'/public'


  // obvious settings
  , port:           port
  , hostname:       '0.0.0.0'


  , pageAtStart:    '/'

  // in order to have real-time change propagation,
  // you'll need to enable the websocket support
  , _socketEnabled:  true

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
 
  , crawlMaxDepth: 20

  //, extensionsDir:  __dirname +'/modules'

  // Loading some Kern extensions
  , extensions: [
      require('./lib/content/content')
    , require('./lib/admin/admin')
    , require('./lib/image/image')
    , require('./lib/av/av')
    , require('./lib/editor/editor')
    , require('./lib/tunes/tunes')
    , require('./lib/breadcrumb/breadcrumb')
    , require('./lib/menu/menu')
    , require('./lib/watcher/watcher')
    , require('./lib/socket/socket')
//    , require('./simplemodule/simplemodule')
  ]
  
  // extension configuration
  , simplemodule: {
    _server: {
      someServerSideOnlyVariable: true
    },
    commonVariable: 'OK!'
  }
});


// if you have compass installed on the machine
// you can watch for changes in your scss/sass files
// (this is not using the "compass watch"
// command but behaves the save)
kernApp.compassWatch();


// finally, start listenning / serve pages
kernApp.serve();



// http://peter.sh/experiments/chromium-command-line-switches/
//var exec = require('child_process').exec;
//exec("google-chrome --incognito "+(kernApp.settings.asApp ? ' --app=' : '')+"http://0.0.0.0:8080");
