(function(K) {
  var $ = jQuery || Zepto || K.$;
  if (!$) 
    throw new Error('No $');


  
  
  
  
  var template = '<div class="preview">' +
  '  <span class="imageHolder">' +
  '    <img />' +
  '    <span class="uploaded"></span>' +
  '  </span>' +
  '  <div class="progressHolder">' +
  '    <div class="progress"></div>' +
  '  </div>' +
  '</div>';
  
  function createIframe(file) {
    var $prv = $(template), $img = $('img', $prv);
    
    var reader = new FileReader();
    reader.onload = function(e) {
      /*
       var frameId = _.uniqueId('filepreview') ;
       $('img', $prv).replaceWith('<iframe class="text-file" name="'+frameId+'"></iframe>');
       $('html', frames[frameId].document).html(e.target.result);
       */
      var info = K.analyse(e.target.result);
    };
    
    reader.readAsText(file);
    
    $prv.appendTo($dropbox);
    
    // Associating a $prv container
    // with the file, using jQuery's $.data():
    
    $.data(file, $prv);
  }
  
  
  
  function createPreview(file) {
    var $prv = $(template), $img = $('img', $prv);
    
    
    if (file.type.match(/^image\//)) {
      var reader = new FileReader();
      $img.width = 100;
      $img.height = 100;
      reader.onload = function(e) {
      
        // e.target.result holds the DataURL which
        // can be used as a source of the $img:
        
        $img.attr('src', e.target.result);
        //              $img.css('background-image', 'url(' + e.target.result + ')');
      
      };
      
      // Reading the file as a DataURL. When finished,
      // this will trigger the onload function above:
      reader.readAsDataURL(file);
    }
    else {
      $img.before('<div class="misc-file"><span class="name">' + file.name + '</span> <span class="mime-type">' + file.type + '</span></div>');
      $img.remove();
    }
    $prv.appendTo($dropbox);
    
    // Associating a $prv container
    // with the file, using jQuery's $.data():
    
    $.data(file, $prv);
  }
  
  function showMessage(msg) {
    $message.html(msg);
  }
  
  
  $(function() {
  
    var $dropbox = $('#dropbox'), $message = $('.message', $dropbox);
    
    if (!$dropbox.length) {
      $('body').append('<div id="dropbox">drop files here</div>');
      $dropbox = $('#dropbox');
    }
    
    
    
    
    
    
    
    
    
    
    
    
    
    $dropbox.filedrop({
      // The name of the $_FILES entry:
      paramname: 'dropbox',
      
      maxfiles: 5,
      maxfilesize: 2000,
      data: {
        context: function() {
          return K.currentPage.get('url');
        }
      },
      url: '/kern',
      
      dragOver: function() {
        $dropbox.addClass('in');
        // user dragging files over #dropzone
      },
      dragLeave: function() {
        $dropbox.removeClass('in');
        // user dragging files out of #dropzone
      },
      docOver: function() {
        $dropbox.addClass('over');
        // user dragging files anywhere inside the browser document window
      },
      docLeave: function() {
        $dropbox.removeClass('over');
        // user dragging files out of the browser document window
      },
      drop: function() {
        // user drops file
      },
      uploadStarted: function(i, file, len) {
        // a file began uploading
        // i = index => 0, 1, 2, 3, 4 etc
        // file is the actual file of the index
        // len = total files user dropped
      },
      uploadFinished: function(i, file, response, time) {
        // response is the data you got back from server in JSON format.
      },
      progressUpdated: function(i, file, progress) {
        // this function is used for large files and updates intermittently
        // progress is the integer value of file being uploaded percentage to completion
      },
      speedUpdated: function(i, file, speed) {
        // speed in kb/s
      },
      rename: function(name) {
        // name in string format
        // must return alternate name as string
      },
      beforeEach: function(file) {
        // file is a file object
        // return false to cancel upload
      },
      afterAll: function() {
        // runs after all files have been uploaded or otherwise dealt with
      },
      
      uploadFinished: function(i, file, response) {
        
        $.data(file).addClass('done');
        // response is the JSON object that post_file.php returns
      },
      
      error: function(err, file) {
        switch (err) {
          case 'BrowserNotSupported':
            showMessage('Your browser does not support HTML5 file uploads!');
            break;
          case 'TooManyFiles':
            alert('Too many files! Please select 5 at most! (configurable)');
            break;
          case 'FileTooLarge':
            alert(file.name + ' is too large! Please upload files up to 2mb (configurable).');
            break;
          default:
            break;
        }
      },
      
      // Called before each upload is started
      beforeEach: function(file) {
        if (file.type.match(/\/html/)) {
          createIframe(file);
        }
        else if (file.type.match(/^(image|video|audio)\//)) {
          createPreview(file);
        }
        else if (file.type.match(/^text\//)) {
        
        }
        else {
        }
        window.lastFile = file;
        //return false;
      },
      
      uploadStarted: function(i, file, len) {
        
      },
      
      progressUpdated: function(i, file, progress) {
        
        
        try {
          $('.progress', $.data(file)).width(progress + '%').text(progress);
        } 
        catch (e) {
          
        }
      }
      
    });
  });
})(kern || false);
