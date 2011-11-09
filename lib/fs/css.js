var _ = require('underscore')._;
_.extend(exports, {
  compressCSS: function(code, gz) {
    code = code.replace(/\/\*(?:(?!\*\/)[\s\S])*\*\/|[\r\n\t]+/g, '');
    // now all comments, newlines and tabs have been removed
    code = code.replace(/ {2,}/g, ' ');
    // now there are no more than single adjacent spaces left
    // now unnecessary: code = code.replace( /(\s)+\./g, ' .' );
    code = code.replace(/ ([{:}]) /g, '$1');
    code = code.replace(/([;,]) /g, '$1');
    code = code.replace(/ !/g, '!');
    return code;
  }
});