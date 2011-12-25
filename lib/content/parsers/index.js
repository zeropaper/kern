var _ = require('underscore')._
  , parsers = []
  , mime = require('mime')
;

function load() {
  _.each(require('fs').readdirSync(__dirname), function(file){
    console.info('Registering parser ?', __dirname +'/'+ file);
    var parser = require(__dirname +'/'+ file);
    if (_.isUndefined(parser) || _.isUndefined(parser.accept) || !_.isFunction(parser.parser)) return;
    console.info('Found parser accepting: ', parser.accept);
    parsers.push(parser);
  });
}

exports.parsers = function() {
  if (!parsers.length) load();
  return parsers;
};

exports.atPath = function(path) {
  var type = mime.lookup(path);
  return exports.find(type);
};

exports.find = function(type) {
  if (!parsers.length) load();
  console.info('Looking for parser for mime '+ type);
  var parser = _.find(exports.parsers(), function(p){ return p.accept === type; });
  if (parser) return parser.parser;
  parser = _.find(exports.parsers(), function(p){ if (_.isRegExp(p.accept)) console.info(p.accept, p.accept.test(type)); return _.isRegExp(p.accept) && p.accept.test(type); });
  if (parser) return parser.parser;
};