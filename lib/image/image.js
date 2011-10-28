var _ = require('underscore')._
  , k = require('./../kern')
  , fs = require('fs')
  , path = require('path')
  , url = require('url')
  , im = require('imagemagick')
;

exports.extIsImage = function(ext) {
  return /^image\//i.test(require('mime').lookup(ext));
};

exports.extender = function() {
  var K = this;
  if (_.isUndefined(K.app)) 
    return;
  K.settings.image = {
    prefix: 'i'
  , inputExts: '(jpg|png|gif|jpeg|bmp|tiff|tif|pdf|svg|psd)'
  , outputExts: '(jpg|png|gif)'
  , presets: {
      same: [],
      thumb: [
          '-thumbnail'
        , '180x180>'
      ]
    }
  };
  
  var S = K.settings.image;
  S.pathExp = new RegExp('/'+ S.prefix +'/([^/]+)((/.+(\.'+ S.inputExts +'))(\.'+ S.outputExts +')|(/.+(\.'+ S.inputExts +')))', 'i');
  K.app.get(S.pathExp, function(req, res, next) {
    
    var info = {},
      params = _.clone(req.params)
    ;
    
    info.preset = params.shift();
    params.shift();
    info.original = params[0];
    info.fromFormat = params[1];
    info.toFormat = params[3];
    if (params[7]) {
      info.original = params[5];
      info.fromFormat = params[6];
      info.toFormat = false;
    }
    var file = K.paths[info.original],
      preset = K.settings.image.presets[info.preset]
    ;
    
    if (!file) return next(new Error('File not found'));
    if (!preset) preset = K.settings.image.presets.same; //return next(new Error('No valid preset'));
    
    fs.stat(file.absPath(), function(err, stats) {
      if (err) return next(err);
      if (info.toFormat == '.json') {
        return im.identify(file.absPath(), function(err, features){
          if (err) return next(err);
          return im.readMetadata(file.absPath(), function(err, metadata){
            res.json(_.extend({}, features, metadata));
          });
        });
      }
      var generated = (K.cacheDir() +'/'+K.settings.image.prefix+'/'+ info.preset + info.original) + (info.toFormat || '');
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