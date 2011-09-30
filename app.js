var Kern = require('./lib/kern').Kern;
var kernApp = new Kern({
  contentDir:   __dirname +'/content',
  publicDir:    __dirname +'/public',
  port:         8080,
  hostname:     '0.0.0.0',
  /*
  session: {
    secret: 'we9dwed',
    key: 'kern.sid'
  }
  */
  // some other settings...
});

kernApp.serve();
