(function(){

var onServer    = typeof window == 'undefined';
var _           = onServer ? require('underscore')._ : window._;
var Content     = {};
var AJAXLinkSelector = 'a[href^="/"]:not([href^="//"])';

Content.extensionName = 'KernContent';

Content.extender = function() {
  if (onServer) { require('./content.server.js').extender.call(this)};
  var K = this;

  K.rules['[src]:not(base),[href]:not(base)'] = function(analysed, place) {
    analysed.refs = analysed.refs || {};
    var exp = /^(http|\/)/ig;
    if (!place) {
      this.each(function() {
        var attr = $(this).attr('src') ? 'src' : 'href';
        var val = $(this).attr(attr);
        if (!exp.test(val)) {
          // console.info('-------------------- '+ val);
          analysed.refs[attr] = analysed.refs[attr] || [];
          analysed.refs[attr].push($(this).attr(attr));
        }
      });
    } else if (this.length) {
      $.each(analysed.refs, function(attrs, attr) {
        for ( var i in attrs) {
          $('[' + attr + '="' + attrs[i] + '"]', this).attr(attr, attrs[i]);
        }
      });
    }
  };

  K.rules['[role=static-dev-scripts]'] = function(analysed, place) {
    this.remove();
  };

  K.rules['[role=document-title], .page-title, title'] = function(analysed, place) {
    if (!place) {
      analysed.title = this.last().text();
    } else if (this.length) {
      this.text(analysed.title);
    }
  };

  K.rules['[role=document-body], body'] = function(analysed, place) {
    analysed.regions = analysed.regions || {};
    if (!place) {
      // console.info('Found '+ this.last().html());
      var $body = this.last().clone();
      // $('script,style', $body).remove();
      analysed.regions.main = $body.html();
    } else if (this.length) {
      /*
       * console.info('this[0].bodyView', this[0].bodyView); if
       * (!this[0].bodyView) { console.info("Creating view for document-body");
       * this[0].bodyView = new BodyView({el: this[0], model: new
       * K.models.ContentEntry(analysed)}); } var view = this[0].bodyView;
       * view.render();
       */
      this.last().html(analysed.regions.main);
      if (!onServer) {
        $(AJAXLinkSelector, this).each(K.AJAXLinkAttach);
      }
    } else {
      console.error('No [role=document-body]');
    }
  };

  K.rules['[role=document-aside]'] = function(analysed, place) {
    analysed.regions = analysed.regions || {};
    if (!place) {
      analysed.regions.aside = this.html();
    } else if (this.length) {
      this.html(analysed.regions.aside);
      $(AJAXLinkSelector, this).each(K.AJAXLinkAttach);
    }
  };

  K.rules['meta[property^="og:"]'] = function(analysed, place) {
    analysed.og = analysed.og || {};
    if (!place) {
      this.each(function() {
        var prop = $(this).attr('property').split('og:');
        analysed.og[prop] = $(this).attr('content');
      });
    } else {
      this.remove();
      $.each(analysed.og || {}, function(prop, content) {
        $('head link, head script').first().before(
            '<meta property="og:' + prop + '" content="' + content + '" />');
      });
    }
  };


  K.rules['script'] = function(analysed, place) {
    // console.info('Looking for scripts', analysed, place);
    if (!place) {
      analysed.scripts = analysed.scripts || {};
      analysed.templates = analysed.templates || {};
      // for (var i = 0; i < $(this).length; i++) {
      //   var $s = $this.eq(i),
      //       script = {
      //         runs : $s.hasClass('kern-common'),
      //         content : $s.html(),
      //         type : /template/i.test($s.attr('type')) ? 'templates' : 'scripts',
      //         id : $s.attr('id'),
      //         src : $s.attr('src')
      //       },
      //       name = (script.src ? script.src : (script.id ? script.id : $s.attr('type') + _.toArray(analysed.scripts).length))
      //   ;

      //   if (script.runs) {
      //     K.eval(script.content, _.extend(analysed, {scriptId: name}));
      //     delete analysed.scriptId;
      //     console.info('Analysed scriptId', analysed);
      //   }

      //   analysed[script.type][name] = script;

      // }
      this
        .each(function() {
          
          var $s = $(this),
              script = {
                runs : $s.hasClass('kern-common'),
                content : $s.html(),
                type : /template/i.test($s.attr('type')) ? 'templates' : 'scripts',
                id : $s.attr('id'),
                src : $s.attr('src')
              },
              name = (script.src ? script.src : (script.id ? script.id : $s.attr('type') + _.toArray(analysed.scripts).length))
          ;

          if (script.runs) {
            script.error = K.eval(script.content, _.extend(analysed, {
              scriptId: name
            }));
            // console.info('Analysed scriptId', analysed.scriptId, analysed);
            delete analysed.scriptId;
          }

          console.info('adding '+ script.type, script.id, script.runs);
          analysed[script.type][name] = script;

        });
    } else {

      if (analysed.templates) {
        // console.info('Adding templates?', analysed.templates);
        _.extend(K.assets.templates, analysed.templates);
        _.each(analysed.templates, function(tmpl) {
          // console.info('Adding template '+ tmpl.id, tmpl.content);
          if (K.$('#'+tmpl.id).length) return;
          K.assets.templates[tmpl.id] = analysed.templates[tmpl.id] = tmpl.content;
          var scriptTag = '<script type="text/template" id="'+ tmpl.id +'">'+ tmpl.content +'</script>';
          K.$('.kern-templates').append(scriptTag);
        });
      }

      if (analysed.scripts) {
        _.each(analysed.scripts, function(script) {
          if (analysed.src) {
            // TODO: create script tag??
          }
          else {
            script.error = K.eval(script.content, analysed);
          }
        });
      }
    }
    // this.remove();
  };

  K.rules['style, link[rel="stylesheet"]'] = function(analysed, place) {
    if (!place) {
      this
          .each(function() {
            var $s = $(this),
                style = {
                  content : $s.html(),
                  type : $s.attr('type'),
                  href : $s.attr('href'),
                  id : $s.attr('id')
                },
                name = (style.href ? style.href : (style.id ? style.id : 'inline' + analysed.styles.length))
            ;
            analysed.styles[name] = style;
          });
    } else {
      // var styles = [ '<!-- new style -->' ];

      // _.each(analysed.styles || {}, function(style, name) {
      //   styles.push(
      //     style.href
      //     ? '<link href="'+ style.href + '" rel="stylesheet" id="'+ style.id +'" />'
      //     : '<style type="text/css" id="'+ style.id +'">' + style.content + '</style>'
      //   );
      // });

      // $('head').append(styles.join("\n"));
    }
    // this.remove();
  };

  K.rules['[type="kern/lib"]'] = function(analysed, place) {
    if (this.length)
      console.info('Searching for library dependencies');
    analysed.libs = analysed.libs || {};
    if (!place) {
      // console.info('Analysed libs before ', analysed.libs);
      this.each(function() {
        var $l = $(this), lib = {
          id : $l.attr('id'),
          serverScript : $l.attr('rel') == 'serverscript'
        };
        if (!lib.id) {
          return;
        }
        if (_.isUndefined(analysed.libs[lib.id])) {
          analysed.libs[lib.id] = lib;
        }
      });
    } else {
      // do something
    }
    // this.remove();
  };

  K.rules['#meta'] = function(analysed, place) {
    if (!place)
      return;
    var info = [];
    info.push(analysed.mime || 'directory');
    this.html(info.join("\n"));
  };

  K.rules['.kern-remove'] = function(analysed) {
    this.remove();
  };

  K.bind('extended', function(){
  	K.log('info', 'content', 'Content is extended on '+ (onServer ? 'server' : 'client'));
    // Content
  });
};

onServer ? module.exports = Content : window.KernContent = Content;

})();