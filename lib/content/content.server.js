var _ = require('underscore')._;


exports.extender = function() {
  var K = this;
  K.assets.scripts['/kern.content.js'] = {
    filepath: __dirname +'/content.js'
  };
};