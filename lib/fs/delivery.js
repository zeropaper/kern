var _ = require('underscore')._;
var jquery = require('jQuery');
var fs = require('fs');




function sortObject(o) {
  var sorted = {}, key, a = [];
  
  for (key in o) {
    if (o.hasOwnProperty(key)) {
      a.push(key);
    }
  }
  
  a.sort();
  
  for (key = 0; key < a.length; key++) {
    sorted[a[key]] = o[a[key]];
  }
  return sorted;
};




function repeat(pattern, count) {
  if (count < 1) 
    return '';
  var result = '';
  while (count > 0) {
    if (count & 1) 
      result += pattern;
    count >>= 1, pattern += pattern;
  };
  return result;
};



function error(req, res, err) {
  var msg = 'Error ' + (err.code || 500) + ': ' + (err.message || 'Undefined error');
  
  
  
  
  var output = exports.errorTemplate(err.code || 500);
  
  res.writeHead(err.code || 500, {
    'Content-type': 'text/html;charset=utf-8'
  });
  res.end(exports.errorTemplateReplacements(output, {
    'error content': msg,
    'error base': '<base href="http://' + req.headers.host + '/" />'
  }));
}

exports.errorTemplate = function(code) {
  
  var paths = [];
  paths.push(__publicdir + '/error-' + (code || 500) + '.html');
  paths.push(__publicdir + '/error.html');
  paths.push(__publicdir + '/index.html');
  
  var output = '<html><head><!-- error base --></head><body><!-- error content --></body></html>'
  try {
    output = fs.readFileSync(__publicdir + '/error-' + (code || 500) + '.html', 'utf-8');
  } 
  catch (e) {
    
    try {
      output = fs.readFileSync(__publicdir + '/error.html', 'utf-8');
    } 
    catch (e) {
      
      try {
        output = fs.readFileSync(__publicdir + '/index.html', 'utf-8');
      } 
      catch (e) {
        
      }
    }
  }
  
  return output;
};

exports.errorTemplateReplacements = function(string, replacements) {
  var replacements = _.extend({
    'error base': '<base href="/" />'
  }, replacements);
  for (var s in replacements) {
    var r = replacements[s];
    
    string = string.split('<!-- ' + s + ' -->').join(r);
  }
  return string;
};



exports.compile = function(str, options) {
//  throw new Error('"compile" method is deprecate');

  return function(locals) {
    if (locals.isLayout) {
      return locals.Kern.applyFile(locals.req.url);
    }
    return 'w00t';
    var content = false;
    if (locals.req.url) {
      var file = locals.Kern.paths[locals.req.url];
      
      
      if (typeof file == 'object' && typeof file.regions == 'object') {
        
        content = file.regions.main;
      }
    }
    else if (typeof options.body == 'string') {
      
      content = options.body;
    }
    else {
      
      var parts = ['<ul class"directory">'];
      for (var f in locals.currentPage.children) {
        var file = locals.currentPage.children[f];
        parts.push('<li><a href="'+ locals.currentPage.name +'/'+ file.name +'">'+ file.name +'</a></li>');
      }
      parts.push('</ul>');
      content = parts.join("\n");
    }
    /*
    content = 'Should not happend';
    */
    return content;
  };
};


/*
 * TODO: replace that with a template
 */
exports.fixHTML = function(html, options) {
  // console.info("------ Rendering HTML:\n"+ html);
  html = html || '<!--<![endif]--><head></head><body></body>';
  
  
  var manifest = '';
  var lang = 'en';
  if (options.Kern.settings.asApp) {
    //manifest = ' manifest="/cache.manifest"'
  }
  
  var parts = ['<!DOCTYPE html>'];
  parts.push('<!--[if lt IE 7]> <html'+manifest+' lang="'+lang+'" class="no-js ie6"> <![endif]-->');
  parts.push('<!--[if IE 7]>    <html'+manifest+' lang="'+lang+'" class="no-js ie7"> <![endif]-->');
  parts.push('<!--[if IE 8]>    <html'+manifest+' lang="'+lang+'" class="no-js ie8"> <![endif]-->');
  parts.push('<!--[if gt IE 8]> <!-->');
  parts.push('<html'+manifest+' lang="'+lang+'" class="no-js">');
  
  




  parts.push(html
    .split('</html>').join('')
    .split('</body>').join('')
    .split('<!-- kern scripts').join("\n")
    .split('kern scripts -->').join("\n")
  );
  
  

  parts.push('<!--[if lt IE 7 ]>');
  parts.push('<script defer src="//ajax.googleapis.com/ajax/libs/chrome-frame/1.0.3/CFInstall.min.js"></script>');
  parts.push('<script defer>window.attachEvent("onload",function(){CFInstall.check({mode:"overlay"})})</script>');
  parts.push('<![endif]-->');
  
  
  
  //  appStates[options.state] = parts;
  //  
  
  parts.push('</body>');
  parts.push('</html>');
  return exports.errorTemplateReplacements(parts.join("\n"), {});
};