var _ = require('underscore')._
  , parsers = []
  , mime = require('mime')
;

function load() {
  K.log('info', 'analysis', 'Loading parsers')
  _.each(require('fs').readdirSync(__dirname), function(file){
    var parser = require(__dirname +'/'+ file);
    if (_.isUndefined(parser) || _.isUndefined(parser.accept) || !_.isFunction(parser.parser)) return;
    parsers.push(parser);
    K.log('info', 'analysis', 'Loaded parser: '+ file, _.keys(parser));
  });
}

exports.parsers = function() {
  if (!parsers.length) load();
  return parsers;
};

exports.atPath = function(path) {
  var type = mime.lookup(path);
  K.log('debug', 'analysis', 'Looking for a parser at '+ path);
  return exports.find(type);
};

exports.find = function(type) {
  var parser = false;
  if (!parsers.length) load();
  var parser = _.find(exports.parsers(), function(p){
    return p.accept === type;
  });
  if (parser) {
    K.log('debug', 'analysis', 'Parser found for '+ type);
    return parser.parser;
  }
  parser = _.find(exports.parsers(), function(p){
    return _.isRegExp(p.accept) && p.accept.test(type);
  });
  if (parser) {
    K.log('debug', 'analysis', 'Parser found for '+ type);
    return parser.parser;
  }
};