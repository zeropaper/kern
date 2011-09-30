About the Kern
==============

    if (global.motivation <= 'tl;dr') { skipTo('Hello World!'); }

The Kern is an attempt to build a set of web project tools with focus on

- Project prototyping
- Design
- Content management
- Delivery
- Extensibility

The Kern is not supposed to be used in a production environement (for now).  


Dependencies
------------

The following node.js modules are required

    express  
    mime  
    connect  
    socket.io  
    underscore  
    backbone  
    jquery  

To install them, just run:

    npm install jquery mime backbone underscore express connect socket.io

Hello world!
------------

    var Kern = require('./lib/kern').Kern;
    var kernApp = new Kern({
      contentDir:   __dirname +'/content',
      publicDir:    __dirname +'/public',
      port:         8080,
      hostname:     'localhost',
      
      // not needed at all... session support
      session: {
        secret: 'we9dwed',
        key: 'kern.sid'
      }
      
      // some other settings...
    });
