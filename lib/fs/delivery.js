var _ = require('underscore')._;
var jquery = require('jquery');
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
  console.log("\n\n");
  console.error(msg);
  console.error(err);
  console.log("\n\n");
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
  var output = '<html><head><!-- error base --></head><body><!-- error content --></body></html>'
  try {
    output = fs.readFileSync(__publicdir + '/error-' + (code || 500) + '.html', 'utf-8');
  } 
  catch (e) {
    console.error('Can not read ' + __publicdir + '/error-' + (code || 500) + '.html');
    try {
      output = fs.readFileSync(__publicdir + '/error.html', 'utf-8');
    } 
    catch (e) {
      console.error('Can not read ' + __publicdir + '/error.html');
      try {
        output = fs.readFileSync(__publicdir + '/index.html', 'utf-8');
      } 
      catch (e) {
        console.error('Can not read ' + __publicdir + '/index.html');
      }
    }
  }
  
  return output;
};

exports.errorTemplateReplacements = function(string, replacements) {
  var replacements = _.extend({
    'error base': '<base href="/" />'
  }, replacements);
  
  
  //console.log('Error replacements', replacements);
  
  
  for (var s in replacements) {
    var r = replacements[s];
    //console.log('Search "<!-- '+s+' -->" and replace with "'+r+'"');
    string = string.split('<!-- ' + s + ' -->').join(r);
  }
  
  return string;
};


exports.renderLayout = function(locals, options) {
  var K = locals.Kern;
  var S = K.settings;
  var layout = S.publicDir +'/layout.html';
  var layoutContent = '';
  console.info('exports.renderLayout, locals', _.keys(locals).join(', '));
  try {
    layoutContent = fs.readFileSync(layout).toString();
  }
  catch(e) {
    // console.info('Can not load the layout content from'+ layout);
    layoutContent = '<html><head></head><body>Fatal crap..</body></html>';
  }
    
  /*
  // Will execute the scripts contained in layouContent... avoid that
  var $html = jquery('<docWrapperHack />').html(layoutContent);
  */
  
  // Will NOT run the scripts in layoutContent
  var $html = jquery('<docWrapperHack>'+layoutContent+'</docWrapperHack>');
  
  $html = $html
    .children('html')
    .first()
  ;
    
  var $ = $html[0]._ownerDocument._parentWindow.jQuery;
  
  var $h = $('head', $html);
  var $b = $('body', $html);
  
  $('[role=static-dev-scripts]', $html)
    .remove();
  
  
  
  // puts the body text/html within the right place
  $('body, [role=document-body]', $html).last().html(locals.main);
  
  // puts the body text/html within the right place
  $('[role=document-aside]', $html).html(locals.aside || '');
    
  $('head title', $html).last().text(locals.title || 'Damn it! Missing page title');
  
  if (locals.menu) {
    // puts the menu html within the right place
    $('header .menu', $html).html(locals.menu);
  }
  
  if (locals.navigation) {
    // puts the menu html within the right place
    $('#side-navigation', $html).html(locals.navigation);
  }
  
  if (locals.breadcrumb) {
    // puts the menu html within the right place
    $('#breadcrumb', $html).html(locals.breadcrumb);
  }
  
  
  
  // rebase
  if ($h.length && options.req) {
    var styles = ['<!-- new style -->'];
    
    _.each(K.assets.styles || {}, function(style, name){
      style.type = style.type || 'text/css';
      styles.push(
        style.href
          ? '<link type="'+style.type+'" href="'+style.href+'" rel="stylesheet" />'
          : '<style type="'+style.type+'">'+style.content+'</style>'
        );
    });
    
    $h.append(styles.join("\n"));
    try {
      if ($('base', $h).length < 1) {
        // console.info('Adding base tag');
        $h.prepend('<base href="http://'+options.req.headers.host+'/" />');
      }
      else {
        // console.info('Changing base tag');
        $('base:first', $h).attr('href', 'http://'+options.req.headers.host+'/');
      }
    }
    catch (e) {
      // console.info('<base /> not found', options);
      // console.error(e);
    }
  }
  else {
    // console.info('No head document or no request information');
  }
  
  var scripts = _.clone(K.assets.scripts || {});
  console.info('K.assets.styles', K.assets.styles);
  return exports.fixHTML($html.html(), {
    Kern: K,
    scripts: _.extend({
      settings: {
        weight: -50,
        data: _.extend({pageAtStart: '/'}, options.clientSettings)
      },    
      startup: {
        weight: 10,
        content: 'var kern = new Kern(settings);var flashes = '+ JSON.stringify(locals.req.flash()) +';console.info("flashes",flashes);kern.flash(flashes);'
      }
    }, K.assets.scripts),
    styles: _.extend({
    }, K.assets.styles)
  });
};


exports.compile = function(str, options) {
  console.info('delivery, exports.compile options', options);
  
  return function(locals) {

    if (locals.isLayout) {
      return locals.Kern.applyFile(locals.req.url);
    }
    var content = false;
    if (locals.req.url) {
      var file = locals.Kern.paths[locals.req.url];
      console.info('locals.currentFile is defined', 'children: '+ _.keys(file.children || {}).join(', '), 'regions: '+ _.keys(file.region ||{}).join(', '));
      // console.log('"'+file.name+'"', file.regions);
      if (typeof file == 'object' && typeof file.regions == 'object') {
        // console.info('Using file attribute main as content');
        content = file.regions.main;
      }
    }
    else if (typeof options.body == 'string') {
      console.error('Using options.body as content, this should not happend');
      content = options.body;
    }
    else {
      console.info('Rendering an index page');
      var parts = ['<ul class"directory">'];
      for (var f in locals.currentFile.children) {
        var file = locals.currentFile.children[f];
        parts.push('<li><a href="'+ locals.currentFile.name +'/'+ file.name +'">'+ file.name +'</a></li>');
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



exports.fixHTML = function(html, options) {
  html = html || '<!--<![endif]--><head></head><body></body>';
  console.info('Fixing HTML before sending response');
  
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
  

  parts.push(html.split('</html>').join('').split('</body>').join(''));
  
  
  
  
  
  var inlineScripts = [];
  var fileScripts = [];
  
  // @todo some aggregation
  
  function addStyleFile(url) {
    return '<link rel="stylesheet" href="' + url + '" />';
  }
  function addStyleData(data) {
    var parts = ['<style type="text/css">', '//<![CDATA[', data, '//]]>', '</style>'];
    return parts.join("\n");
  }
  
  function addScriptFile(url) {
    return '<script type="text/javascript" src="' + url + '"></script>';
  }
  function addScriptData(data) {
    var parts = ['<script type="text/javascript">', '//<![CDATA[', data, '//]]>', '</script>'];
    return parts.join("\n");
  }
  function addScriptFileCDN(url, test, fallback) {
    var parts = ['', '<!-- CDN -->', addScriptFile(url), addScriptData(test + ' || document.write(\'<script type="text/javascript" src="' + fallback + '"><\\/script>\');'), ''];
    return parts.join("\n");
  }
  
  function sorting(a, b){
    a.weight = ((!a.weight) ? 0 : Number(a.weight));
    b.weight = ((!b.weight) ? 0 : Number(b.weight));
    return a.weight - b.weight;
  }
  //console.info('Adding scripts to the output', options.scripts);
  var js = [];
  _.each(options.scripts, function(info, path) {
    js.push(_.extend({path: path, weight: 0}, info));
  });
  js.sort(sorting);
  console.info('sorted', js);
  _.each(js, function(info) {
    if ((!info.section || info.section != '# rev ') && !info.ajaxOnly) {
      if (typeof info.cdn == 'object') {
        //console.info('Injecting script with CDN for ' + info.path);
        parts.push(addScriptFileCDN(info.cdn.url, info.cdn.test, info.path));
      }
      else if (typeof info.data != 'undefined') {
        //console.info('Injecting data for ' + info.path, info.data);
        parts.push(addScriptData('var ' + info.path + ' = _.extend(' + info.path + ' || {}, ' + JSON.stringify(info.data) + ');'));
      }
      else if (typeof info.content != 'undefined') {
        //console.info('Injecting inline script for ' + info.path);
        parts.push(addScriptData(info.content));
      }
      else {
        //console.info('Injecting script for ' + info.path);
        parts.push(addScriptFile(info.path));
      }
    }
  });
  
  
  
  
  //console.info('Adding styles to the output', options.styles);
  var css = [];
  _.each(options.styles, function(info, path) {
    css.push(_.extend({path: path, weight: 0}, info));
  });
  css.sort(sorting);
  console.info('sorted', css);
  _.each(css, function(info) {
    
    if ((!info.section || info.section != '# rev ') && !info.ajaxOnly) {
      if (typeof info.data != 'undefined') {
        //console.info('Injecting data for ' + info.path, info.data);
        parts.push(addStyleData('var ' + info.path + ' = _.extend(' + info.path + ' || {}, ' + JSON.stringify(info.data) + ');'));
      }
      else if (typeof info.content != 'undefined') {
        //console.info('Injecting inline style for ' + info.path);
        parts.push(addStyleData(info.content));
      }
      else {
        //console.info('Injecting style for ' + info.path);
        parts.push(addStyleFile(info.path));
      }
    }
  });
  
  
  
  
  parts.push('<!--[if lt IE 7 ]>');
  parts.push('<script defer src="//ajax.googleapis.com/ajax/libs/chrome-frame/1.0.3/CFInstall.min.js"></script>');
  parts.push('<script defer>window.attachEvent("onload",function(){CFInstall.check({mode:"overlay"})})</script>');
  parts.push('<![endif]-->');
  
  
  
  //  appStates[options.state] = parts;
  //  console.info('There is now static '+(appStates.length)+' states');
  
  parts.push('</body>');
  parts.push('</html>');
  return exports.errorTemplateReplacements(parts.join("\n"), {});
};