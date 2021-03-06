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
    _contentDir: __dirname +'/content',
    // _contentDir: path.normalize(rootDir +'../projects/DiscoBandits/content'),
    _publicDir: path.normalize(__dirname +'/../../public'),
    _cacheDir: path.normalize(__dirname +'/../../cache'),

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
  kern.bind('extended', function(){
    
  });





  describe("running", function() {
    
    it("monitors the time running", function(){
      runs(function () {
        expect(kern.runningFor()).toBeGreaterThan(0);
      });
    });





    runs(function(){
      kern.serve();
    });

    runs(function(){
      
      describe("home page", function() {
        var respCode = false;
        var data;
        var options = {
          host: kern.get('hostname'),
          port: kern.get('port'),
          path: kern.get('pageAtStart')
        };

        it("The URL: "+ options.host +':'+ options.port + options.path +" returns a 200 HTTP response code", function(){
          runs(function() {
            var req = require('http')
            .get(options, function(res){
              
              respCode = res.statusCode;
              res.setEncoding('utf8');
              res.on('data', function(chunk) {
                
                data += chunk;
              });

              res.on('end', function() {
                
                
              });
            })
            .on('error', function(e){
              
              respCode = false;
            });
            
          });

          runs(function(){
            expect(respCode).toEqual(200);
            
          });
        });
        
        
      });// home page
    });


    
  });// running

  // delete kern;

});// Kern