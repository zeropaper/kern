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

If you don't have node.js 0.6.4 and npm installed yet (and are using *Ubuntu*),
there's a node-install.sh bash script you can run.  
Please... before using this script, read it.

	else
 
Find out how to install node.js 0.6.4 and npm and explain me...
I'll write it down here. Thanks in advance.

You may need compass and the compass html5-boilerplate gems. On *Ubuntu*:
TODO: use rvm to control ruby version
    
    sudo apt-get install ruby1.9.1 # in order to install "gem"
    sudo gem install html5-boilerplate # will install compass if needed

The rest should be:

    git clone git://github.com/zeropaper/kern.git
    cd kern
    npm install -d
    cd public/js
    mkdir lib
    cd lib
    git clone git://github.com/documentcloud/underscore.git
    git clone git://github.com/documentcloud/backbone.git
    git clone git://github.com/jquery/jquery.git
    cd jquery && make && cd ..
    git clone git://github.com/madrobby/zepto.git
    git clone git://github.com/johndyer/mediaelement.git
    git clone git://github.com/Modernizr/Modernizr.git
    git clone git://github.com/weixiyen/jquery-filedrop.git
    git clone git://github.com/ehynds/jquery-notify.git

	wget http://documentcloud.github.com/backbone/backbone.js ./backbone.js


Hello world!
------------

    var Kern = require('./lib/kern').Kern;
    var kernApp = new Kern({
      // you may need to create that directory or adapt the path
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
    
    // if you installed compass
    kernApp.compassWatch();
