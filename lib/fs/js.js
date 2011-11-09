var _ = require('underscore')._;
_.extend(exports, {
  compressJS: function(code, gz) {
    try {
      var jsp = require("uglify-js").parser;
      var pro = require("uglify-js").uglify;
      var ast = jsp.parse(code); // parse code and get the initial AST
      ast = pro.ast_mangle(ast); // get a new AST with mangled names
      ast = pro.ast_squeeze(ast); // get an AST with compression optimizations
      return pro.gen_code(ast); // compressed code here
    } 
    catch (e) {
      console.error(e);
      return code;
    }
  }
});