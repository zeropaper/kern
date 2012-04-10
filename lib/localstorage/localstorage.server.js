var _ = require('underscore')._;
exports.extensionName = 'KernLocalStorage';
exports.version = '0.0.1';
exports.assets = {
  scripts: {
    '/kern.localstorage.js': {
      filepath: __dirname +'/localstorage.js'
    }
  }
};
exports.extender = function() {
  var K = this,
      S = K.settings.localStorage || (K.settings.localStorage = {})
  ;
  _.extend(K.assets.scripts, exports.assets.scripts);
};