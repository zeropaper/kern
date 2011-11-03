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


Install
------------

    git clone git://github.com/zeropaper/kern.git
    cd kern
    npm install -d
    cd public/js
    mkdir lib
    cd lib
    git clone git://github.com/documentcloud/underscore.git
    git clone git://github.com/documentcloud/backbone.git
    git clone git://github.com/jquery/jquery.git && cd jquery && make && cd ..
    git clone git://github.com/madrobby/zepto.git
    git clone git://github.com/johndyer/mediaelement.git
    git clone git://github.com/Modernizr/Modernizr.git
    git clone git://github.com/weixiyen/jquery-filedrop.git

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
