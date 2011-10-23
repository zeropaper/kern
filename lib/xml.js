var fs = require('fs')
  , xml2js = require('xml2js')
  , http = require('http')
  , url = require('url')
  , parser = new xml2js.Parser()
  , fileUrl = 'http://schema.org/docs/schemaorg.owl'
  , Downloader = require('./fs/fs').Downloader
;

var dl = new Downloader(fileUrl, function(localFile) {
  fs.readFile(localFile, function(err, data) {
    parser.parseString(data, function(err, result) {
      console.dir(result);
      console.log('Done');
    });
  });
});
dl.run();
