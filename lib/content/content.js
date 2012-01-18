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

  K.rules['video'] = function(analysed, place) {
    analysed.medias = analysed.medias || {};
    analysed.medias.videos = analysed.medias.videos || {};
    var vids = analysed.medias.videos;
    if (!place) {
      this.each(function() {

      });
    } else if (this.length) {
      $.each(vids, function(ref) {
        var attr = ref.split('::').shift();
        var val = ref.split('::').pop();
        $('[' + attr + '="' + val + '"]', this).attr(attr, val);
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
      analysed.regions.main = this.last().html();
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
        $(AJAXLinkSelector, this).each(AJAXLinkAttach);
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
      $(AJAXLinkSelector, this).each(AJAXLinkAttach);
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
    if (!onServer)
      return;
    analysed.scripts = analysed.scripts || {};
    if (!place) {
      this
          .each(function() {
            var $s = $(this), script = {
              content : $s.html(),
              type : $s.attr('type'),
              src : $s.attr('src'),
            }, name = (script.src ? script.src : $s.attr('type')
                + _.toArray(analysed.scripts).length);

            analysed.scripts[name] = script;
          });
    } else {
    }
  };

  K.rules['style, link[rel="stylesheet"]'] = function(analysed, place) {
    if (!onServer)
      return;
    analysed.styles = analysed.styles || {};
    if (!place) {
      this
          .each(function() {
            var $s = $(this), style = {
              content : $s.html(),
              type : $s.attr('type'),
              href : $s.attr('href'),
            }, name = (style.href ? style.href : 'inline'
                + analysed.styles.length);
            analysed.styles[name] = style;
          });
    } else {
      var styles = [ '<!-- new style -->' ];

      _.each(analysed.styles || {}, function(style, name) {
        styles.push(style.href ? '<link type="' + style.type + '" href="'
            + style.href + '" rel="stylesheet" />' : '<style type="'
            + style.type + '">' + style.content + '</style>');
      });

      $('head').append(styles.join("\n"));
    }
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