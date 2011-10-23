var _ = require('underscore')._
  , k = require('./../kern')
  , fs = require('fs')
  , path = require('path')
  , url = require('url')
  , im = require('imagemagick')
;


exports.extender = function() {
  var K = this;
  if (_.isUndefined(K.app)) 
    return;
  K.settings.tunes = {
    albumsUrl: '/albums'
  };
  
  K.assets.scripts['/kern.tunes.js'] = {
    filepath: __dirname +'/tunes.client.js'
  };
  
  K.app.get('/kern.tunes/albums', function(req, res, next){
    res.json([{
    "title": "Bound - Zen Bound Ingame Music",
    "artist": "Ghost Monkey",
    "tracks": [{
        "title": "Care",
        "url": "/music/blue.mp3"
    },
    {
        "title": "Rope and Wood",
        "url": "/music/jazz.mp3"
    },
    {
        "title": "Problem Solvent",
        "url": "/music/minimalish.mp3"
    },
    {
        "title": "Unpaint My Skin",
        "url": "/music/slower.mp3"
    },
    {
        "title": "Nostalgia",
        "url": "/music/blue.mp3"
    },
    {
        "title": "Interludum",
        "url": "/music/jazz.mp3"
    },
    {
        "title": "Grind",
        "url": "/music/minimalish.mp3"
    },
    {
        "title": "Diagrams",
        "url": "/music/slower.mp3"
    },
    {
        "title": "Hare",
        "url": "/music/blue.mp3"
    },
    {
        "title": "Carefree",
        "url": "/music/jazz.mp3"
    },
    {
        "title": "Tunnel At The End Of Light",
        "url": "/music/minimalish.mp3"
    }]
},
{
    "title": "Where the Earth Meets the Sky",
    "artist": "Tom Heasley",
    "tracks": [{
        "title": "Ground Zero",
        "url": "/music/blue.mp3"
    },
    {
        "title": "Western Sky",
        "url": "/music/jazz.mp3"
    },
    {
        "title": "Monterey Bay",
        "url": "/music/minimalish.mp3"
    },
    {
        "title": "Where the Earth Meets the Sky",
        "url": "/music/slower.mp3"
    }]
}]);
  });
};