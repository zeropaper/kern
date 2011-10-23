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
  K.settings.image = {
    prefix: 'i'
  , presets: {
      same: [],
      thumb: [
          '-thumbnail'
        , '180x180>'
      ]
    }
  };
    
  var manipulator = new RegExp('/'+K.settings.image.prefix+'/([^/]+)((/.+([.]{1,1}[a-zA-Z0-9]+))([.]{1,1}[a-zA-Z0-9]+)|(/.+([.]{1,1}[a-zA-Z0-9]+)))');
  K.app.get(manipulator, function(req, res, next) {
    var
      params = _.clone(req.params),
      presetName = params.shift(),
      preset = K.settings.image.presets[presetName],
      original = params[1] || params[4],
      fromFormat = params[2] || params[5],
      toFormat = params[3] || false,
      file = K.paths[original]
    ;
    
    console.info('preset, path, fromFormat, toFormat, file', presetName, original, fromFormat, toFormat);
    if (!file) return next(new Error('File not found'));
    if (!preset) preset = K.settings.image.presets.same; //return next(new Error('No valid preset'));
    
    fs.stat(file.absPath(), function(err, stats) {
      if (err) return next(err);
      if (toFormat == '.json') {
        return im.identify(file.absPath(), function(err, features){
          if (err) return next(err);
          return im.readMetadata(file.absPath(), function(err, metadata){
            res.json(_.extend({}, features, metadata));
          });
        });
      }
      var generated = (K.cacheDir() +'/'+K.settings.image.prefix+'/'+ presetName + original) + (toFormat || '');
      return res.sendfile(generated, function(err){
        if (err) {
          K.fs.recursMkdir(path.dirname(generated), 0777, function(err){
            if (err) return next(err);
            
            console.info(file.absPath() +' will be converted to '+ generated +' with preset');
            var args = _.clone(preset);
            
            args.unshift(file.absPath());
            args.push(generated);
            im.convert(args, function(err, metadata){
              if (err) return next(err);
              res.sendfile(generated, function(err){
                if (err) return res.sendfile(file.absPath(), function(err) {
                  return next(err);
                });
              });
            });
          });
        }
      });
    });
  });
  
};