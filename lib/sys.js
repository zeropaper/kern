var sys = {}
  , tests = {}
  , _ = require('underscore')._
  , Backbone = require('backbone')
;


sys.commandExists = function(command, cb) {
  var K = this;
  require('child_process').exec('hash '+ command, function (error, stdout, stderr) {
    console.log('stdout: ' + stdout);
    console.log('stderr: ' + stderr);
    console.info('Test result: ', error !== null);
    K.tests[K.testCurrent] = error !== null;
    if (typeof cb == 'function') cb.call(K, K.tests[K.testCurrent]); 
  });
};

tests.ffmpeg = function() {
};

sys.check = function(tests, cb) {
  var K = this;
  var testProc = Backbone.Model.extend({
    defaults: {
      tested: false,
    },
    initialize: function(attributes, options) {
      
    }
  });
  var testsSuite = Backbone.Collection.extend({model:testProc});
  var testCollection  = new testsSuite(tests);
  
  K.tests = _.clone(tests);
  for (var t in K.tests) {
    K.testCurrent = t;
    try {
      if (typeof test === 'function') test.call(K);
    } catch (err) {
      console.error('Error while running test '+ K.testCurrent);
      console.error(err);
    }
  }
  
  var out = [];
  for (var t in tests) {
    console.info(t +': '+ K.tests[t]);
    out.push('<li class="'+typeof K.tests[t]+' '+ (K.tests[t] && typeof K.tests[t] != 'function' ? 'success' : 'error') +'">'+ t +' <pre>'+ tests[t].toString() +'</pre></li>');
  }
  
  delete K.tests;
  delete K.testCurrent;
  
  out.unshift('<ul>');
  out.push('</ul>');
  if (typeof cb == 'function') return cb.call(K, out.join("\n"));
  return out.join("\n");
};

//

_.extend(exports, sys);
