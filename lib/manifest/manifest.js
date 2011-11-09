exports.manifest = function(){
  var K = this;
  var cache = {
    '# rev ': [],
    'CACHE:': [],
    'FALLBACK:': [],
    'NETWORK:': []
  };
  _.each(K.assets, function(assets, type){
    _.each(assets, function(info, url){
      var section = info.section || '# rev ';
      cache[section] = cache[section] || [];
      
      if (url.substr(0, 1) == '/') {
        cache[section].push(url);
      }
      
    });
  });
  
  var lines = ['CACHE MANIFEST'];
  for (var section in cache) {
    lines.push('# '+ section +', '+ cache[section].length);
    if (cache[section].length) {
      lines.push(section +(section == '# rev ' ? K.started() : ''));
      lines = _.union(lines, cache[section]);
    }
  }
  return lines.join("\n");
};

