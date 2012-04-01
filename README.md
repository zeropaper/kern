About the Kern
==============

The Kern is an attempt to build a set of web project tools with focus on

- Project prototyping
- Design
- Content management
- Delivery
- Extensibility

The Kern is not supposed to be used in a production environement (for now).  


Install
------------

__This stuff needs to be updated__

1. Installing node (note: v0.6.13 is perfectly fine as far as I know)

        git clone git://github.com/creationix/nvm.git ~/.nvm
        . ~/.nvm/nvm.sh
        nvm sync
        nvm install v0.4.12
        nvm use v0.4.12

2. The rest should be:

        git clone git://github.com/zeropaper/kern.git
        cd kern
        mkdir cache #if you want your cache to be located here
        npm install -d
        cd public/js
        mkdir lib
        cd lib
        git clone git://github.com/jquery/jquery-ui.git
        git clone git://github.com/madrobby/zepto.git
        git clone git://github.com/johndyer/mediaelement.git
        git clone git://github.com/Modernizr/Modernizr.git
        git clone git://github.com/weixiyen/jquery-filedrop.git
        git clone git://github.com/ehynds/jquery-notify.git
    

Hello world!
------------

    var Kern = require('./lib/kern').Kern;
    var kernApp = new Kern({
      // you may need to create that directory or adapt the path
      _contentDir:   __dirname +'/content',
      _publicDir:    __dirname +'/public',
      port:         8080,
      hostname:     'localhost',
      
      // not needed at all... session support
      _session: {
        secret: '<keyboard cat>',
        key: 'kern.sid'
      }
      
      // some other settings...
    });

