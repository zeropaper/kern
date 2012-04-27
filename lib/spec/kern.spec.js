/**
 * https://github.com/pivotal/jasmine/wiki/Matchers
 */
describe("Kern", function() {

  var _ = require('underscore')._;
  var path = require('path');
  var rootDir = path.normalize(__dirname + '../../');
  var Kern = require(__dirname +'./../kern').Kern;
  
  var settings = {
    port: 4009,

    // enables session support
    session: {
      secret:  'we9dwed',
      key:     'kern.sid'
    },
    appName: 'KernTest',
    contentDir: __dirname +'/content',
    // contentDir: path.normalize(rootDir +'../projects/DiscoBandits/content'),
    publicDir: path.normalize(__dirname +'/../../public'),
    cacheDir: path.normalize(__dirname +'/../../cache'),

    extensions: [
      require(path.normalize(__dirname +'/../content/content'))
    ]
  };

  beforeEach(function() {
    var matchers = require(__dirname +'/matchers.js');
    this.addMatchers(matchers);
  });


  var kern;
  kern = new Kern(settings);

  describe("configuration", function(){
    
    it('Has a name', function() {
      expect(kern.get('appName')).toBe(settings.appName);
    });
    
    it('Has a jQuery', function() {
      expect(kern.$).toBeDefined();
    });
    
    it('Has a content directory ('+ settings._contentDir +')', function() {
      expect(kern.contentDir()).toBe(settings._contentDir);
    });
    it('The content directory ('+ settings._contentDir +') exists', function() {
      expect(kern.contentDir()).pathToExists();
      expect(kern.contentDir()).toBeADirectory();
    });

    it('Has a public directory ('+ settings._publicDir +')', function() {
      expect(kern.publicDir()).toBe(settings._publicDir);
    });
    it('The public directory ('+ settings._publicDir +') exists', function() {
      expect(kern.publicDir()).pathToExists();
      expect(kern.publicDir()).toBeADirectory();
    });

    it('Has a cache directory ('+ settings._cacheDir +')', function() {
      expect(kern.cacheDir()).toBe(settings._cacheDir);
    });
    it('The cache directory ('+ settings._cacheDir +') exists', function() {
      expect(kern.cacheDir()).pathToExists();
      expect(kern.cacheDir()).toBeADirectory();
    });

  });// configuration

  describe("Content system", function() {
    waitsFor(function() {
      return !_.isUndefined(kern.paths['/']) && !_.isUndefined(kern.paths['/'].children);
    }, "Did not parse the root content entry.", 200);

    it("Has a not 'paths' property", function(){
      expect(kern.paths).toBeDefined();
    });
    
    it("Has a 'struct' property", function(){
      expect(kern.struct).toBeDefined();
    });
    
    it("Has a 'struct' property to be a Backbone Model.", function(){
      expect(kern.struct).toBeAModel();
    });

    it('Has a "atId"', function(){
      expect(kern.atId).toBeAFunction();
    });
    
    
    it("Has a 'struct' property to be have a 'get' method.", function(){
      expect(kern.struct).toHaveMethod('get');
    });
    
    var m = [
      'url',
      'title',
      'parent',
      'load',
      'isFile',
      'isEmpty',
      'isDir',
      'isIndex',
      'hasIndex',
      'hasChildren',
      'extname',
      'existsSync',
      'exists',
      'eachParents',
      'eachParentsObject',
      'eachChildren',
      'eachChildrenObject',
      'childPaths',
      'cover',
      'dirname'
    ];
    it("Has a content entry (Kern.struct property) to have the following methods: "+ m.join(', ') +".", function(){
      expect(kern.struct.__proto__).toHaveMethods(m);
    });

    it("Has a 'struct' property to have a 'attributes' property.", function(){
      expect(kern.struct).toHaveProperty('attributes');
    });
    
    it("Has a 'struct' property to have the following properties: "+ ['parent', 'children', 'Kern'].join(', ') +".", function(){
      expect(_.keys(kern.struct)).toHaveArrayValues(['parents', 'children', 'Kern']);
    });
    
    it("kern.struct.children property is a collection", function(){
      expect(kern.struct.children).toBeACollection();
    });

  });// content

  describe("Content models", function(){
    
    

    
    var demoEntry = kern.paths['/model-parsing.html'];
    waitsFor(function(){
      demoEntry = kern.paths['/model-parsing.html'];
      return !_.isUndefined(demoEntry) && !_.isUndefined(demoEntry.initialized) && demoEntry.initialized == true;
    }, "DemoEntry could not be located", 200);

    it("Content entry children (Kern.struct.children property) to have the following properties: "+ [
        'Kern',
        'length'
      ].join(', ') +".", function(){
        expect(_.keys(kern.struct.children)).toHaveArrayValues([
        'Kern',
        'length'
      ]);
    });


    it("The paths property have the following paths: "+ (['/', '/model-parsing.html', '/pageA.html', '/subdirA'].join(', ')), function(){
      expect(_.keys(kern.paths)).toHaveArrayValues(['/', '/model-parsing.html', '/pageA.html']);
    });

    it ("The demoEntry is defined.", function() {
      expect(demoEntry).toBeDefined();
    });
    
    it ("The demoEntry.Kern is defined.", function() {
      expect(demoEntry.Kern).toBeDefined();
    });
    
    it ("The demoEntry.collection is defined.", function() {
      expect(demoEntry.collection).toBeDefined();
    });

    it ("The demoEntry.children is defined.", function() {
      expect(demoEntry.children).toBeDefined();
    });

    waitsFor(function(){
      if (demoEntry.scanned) {
        
        return true;
      }
      return false;
    }, "the demo content entry to be scanned", 100);
    
    it ("The demoEntry.children.Kern is defined.", function() {
      expect(typeof demoEntry.children.Kern).toEqual('object');
    });

    it ("The demo entry to have a 'regions' attribute.", function() {
      expect(demoEntry.has('regions')).toBeTruthy();
    });

    it ("The demoEntry.toJSON().regions is defined.", function() {
      expect(demoEntry.toJSON().regions).toBeDefined();
    });

    it ("The demo entry to have a 'templates' attribute.", function() {
      expect(demoEntry.has('templates')).toBeTruthy();
    });

    it ("The demo entry to have a 'scripts' attribute.", function() {
      expect(demoEntry.has('scripts')).toBeTruthy();
    });

    it ("All common scripts are runned successfully.", function() {
      
      var commonScripts = _.filter(demoEntry.get('scripts'), function(i){
        
        return i.runs;
      });
      
      // _.each(commonScripts, function(script, id) {
      //   expect(script.error).toBeUndefined();
      // });
      var failed = _.filter(commonScripts, function(i){
        
        if (i.error) {
          throw i.error;
        }
        return !_.isUndefined(i.error);
      }).length;
      expect(failed).toBeLessThan(1);
    });

    

    waitsFor(function(){
      
      return !_.isUndefined(demoEntry.attributes.data) || !_.isUndefined(demoEntry.attributes.error);
    }, "either data or error to be defined", 1000);

    it ("The demo entry to have a 'data' attribute.", function() {
      
      expect(demoEntry.has('data')).toBeTruthy();
    });


  });



  describe("Serving", function(){
    // var code = false;
    // var options = {
    //   host: kern.get('hostname'),
    //   port: kern.get('port'),
    //   path: kern.get('pageAtStart')
    // };

    // runs(function(){
    //   kern.serve();

    //   response = require('http').get(options, function(res) {
    //     code = res.statusCode;
    //     
    //   }).on('error', function(e) {
    //     code = 'error';
    //     
    //   });
    // });

    // waitsFor(function(){
    //   if (code) {
    //     
    //   }
    //   return code;
    // }, "fetching root URL", 1000);

    // it("Delivers a 200 HTTP response code for the http://"+options.host+":"+options.port+options.path+" URL", function(){
    //   expect(code).toEqual(200);
    //   kern.app.close();
    // });

    // runs(function(){

    //   options.path = '/page-not-found';

    //   response = require('http').get(options, function(res) {
    //     _res = res;
    //     
    //   }).on('error', function(e) {
    //     
    //   });
    // });
    // waitsFor(function(){
    //   if (response.finished) {
    //     
    //   }
    //   return response.finished;
    // }, "fetching root URL", 1000);
    
    // it("Delivers a 404 HTTP response code for the http://"+options.host+":"+options.port+options.path+" URL", function(){
    //   expect(response.statusCode).toEqual(404);
    //   kern.app.close();
    // });
  });


  describe("Running", function() {
    
    it("monitors the time running", function(){
      runs(function () {
        expect(kern.runningFor()).toBeGreaterThan(0);
      });
    });

  });


});// Kern