(function($) {
  $(window).load(function(){
    console.info('Starting editor');
    var $notifier = $('#notifier').css({
      'z-index': 10000,
      position: 'absolute'
    }).notify();
    
    function ckeditorSave() {
      console.info($('textarea').val());
      $('form').ajaxSubmit({
        url: $('form').attr('rel'),
        dataType: 'json',
        success: function(data, statusText, xhr, $form){
          console.info(data, statusText);
          var error = data.success ? '' : '<div class="error">'+ data.error.message +'</div>';
          $notifier.notify('create', {
            title: data.success ? 'Success!' : 'Error',
            text: $('[name=document-title]').val() + (data.success ? ' has been saved!' : ' could not be saved.') + error
          }, {
            expires: data.success
          });
        }
      });
      return false;
    }
    window.ckeditorSave = ckeditorSave;
    
    $('form').attr('rel', $('form').attr('action')).attr('action', 'javascript:ckeditorSave();void(0);');
    
    
    
    $('textarea').ckeditor(function(){
    }, {
      docType: '<!DOCTYPE HTML>',
      scayt_autoStartup: true,
      fullPage : true,
//      extraPlugins: 'kernSave',
//      extraPlugins: 'stylesheetparser',
      contentsCss: '/css/style.css',
      resize_enabled: false
      
    }).bind('instanceReady.ckeditor', function(){
      console.info('instanceReady.ckeditor');
      var editor = $(this).ckeditorGet();
      
      // doesn't work... too bad
      editor.on('maximize', function(evt) {
        $('html, body, form').css({
          position: 'relative',
          width: '100%',
          height: '100%'
        });
        console.info('Maximized editor');
      });
      
      editor.execCommand('maximize');
      
      $('html, body, form').css({
        position: 'relative',
        width: '100%',
        height: '100%'
      });
    });
    
    $('textarea').bind('setData.ckeditor', function(ev, opt) {
      console.info('setData', arguments);
    }).bind('getData.ckeditor', function(ev, opt) {
      console.info('getData', arguments);
    });

  });
})(jQuery);
