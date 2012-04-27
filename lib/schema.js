
    , parser = new xml2js.Parser()
    , schemaUrl = 'http://schema.org/docs/schemaorg.owl'
    , Downloader = require('./fs/fs').Downloader
    
    
    /*
  var dl = new Downloader(schemaUrl, function(localFile) {
    fs.readFile(localFile, function(err, data) {
      parser.parseString(data, function(err, result) {
        if (err) return 
        try {
          readSchema.call(K, result);
        }
        catch (e) {
          
        }
      });
    });
  });
  dl.run();
  */
  


function readSchema(schema) {
  var K = this
    , modelDefs = {}
  ;
  K.schema = schema;
  K.OWL = {Class:{}};
  K.dataModels = K.dataModels || {};
  
  
  function searchParentClass(rdfResource) {
    for (var n in K.schema['owl:Class']) {
      if (K.schema['owl:Class'][n]['@']['rdf:about'] == rdfResource) return K.schema['owl:Class'][n];
    }
    return {};
  }
  
  function getParentClass(parentResourceName) {
    if (typeof K.OWL.Class[parentResourceName] != 'object') {
      var parent = {
        label: parentResourceName
      };
      _.extend(parent, toObj(searchParentClass(parentResourceName)));
      K.OWL.Class[parentResourceName] = parent;
    }
    return K.OWL.Class[parentResourceName];
  }
  
  
  function toObj(O) {
    if (!_.isArray(O)) return {};
    var obj = {};
    for (var o in O) {
      var rdfs = {};
      for (var r in O[o]) {
        if (r.substr(0, 5) != 'rdfs:') continue;
        
        
        var rdfsName = r.substr(5, r.length);
        
        if (rdfsName == 'subClassOf') {
          
          var parents = [];
          if (O[o][r].length) {
            for (var c in O[o][r]) {
              
              var parent = searchParentClass(O[o][r][c]['@']['rdf:resource']);
              parents.push(parent['rdfs:label']['#']);
            }
          }
          else {
            var parent = searchParentClass(O[o][r]['@']['rdf:resource']);
            parents.push(parent['rdfs:label']['#']);
          }
          rdfs[rdfsName] = parents;
          
          
          
        }
        else if (rdfsName == 'domain' || rdfsName == 'range') {
          if (!O[o][r]['owl:Class'] || !O[o][r]['owl:Class']['owl:unionOf']) continue;
            
          var desc = O[o][r]['owl:Class']['owl:unionOf']['rdf:Description'];
          var union = [];
          if (desc.length) {
            for (var i in desc) {
              if (desc[i]['@']) {
                var c = searchParentClass(desc[i]['@']['rdf:about']);
                union.push(c['rdfs:label']['#']);
              }
            }
          }
          else {
            var c = searchParentClass(desc['@']['rdf:about']);
            union.push(c['rdfs:label']['#']);
          }
          rdfs[rdfsName] = union;
          
        }
        else {
          rdfs[rdfsName] = O[o][r]['#'];
        }
        
      }
      obj[rdfs.label] = rdfs;
    }
    return obj;
  }
  for (var name in schema) {
    var info = schema[name];
    if (name.substr(0, 4) != 'owl:') continue;
    var ext = {};
    var prpName = name.substr(4, name.length);
    K.OWL[prpName] = typeof K.OWL[prpName] != 'object' ? {} : K.OWL[prpName];
    
    _.extend(K.OWL[prpName], toObj(info));
  }
  /*
  
  
  
  
  */
}




  app.get('/kern/schema.owl.js', function(req, res, next){
    res.json(K.OWL || {});
  });
  app.get('/kern/schema.js', function(req, res, next){
    res.json(K.schema || {});
  });