(function(){

var onServer    = typeof window == 'undefined';
var _           = onServer ? require('underscore')._ : window._;
var Content     = {};
var AJAXLinkSelector = 'a[href^="/"]:not([href^="//"])';

Content.extensionName = 'KernContent';



// ----- String utilities ------
function cleanID(str) {
  return $.trim(str).split(/[^0-9a-z-]+/i).join('-').toLowerCase();
}

function getText(selector) {
  return $.trim($(selector, this).text());
}

function getList(selector) {
  return _.compact(_.map(getText.call(this, selector).split(','), function(s) { return $.trim(s); }));
}

function getDuration(selector) {
  var str = getText.call(this, selector);
  var hours = 0;
  var pieces = _.map(str.split(','), function(s) {
    s = $.trim(s);
    if (/^[0-9]+[\s]*h$/i.test(s)) {
      return parseInt(s);
    }
    else if (/^[0-9]+[\s]*(m|min)$/i.test(s)) {
      return parseInt(s) / 60;
    }
    else if (/^[0-9]+[\s]*d$/i.test(s)) {
      return parseInt(s) * 8;
    }
    return 0;
  });
  _.each(pieces, function(h) {
    hours += h;
  });
  // console.info('Computed hours: '+ hours, pieces);
  return hours;
}

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

  K.rules['[data-kern-role=static-dev-scripts]'] = function(analysed, place) {
    this.remove();
  };

  K.rules['[data-kern-role=document-title], .page-title, title'] = function(analysed, place) {
    if (!place) {
      analysed.title = this.last().text();
    } else if (this.length) {
      this.text(analysed.title);
    }
  };

  K.rules['[data-kern-role=document-body], body'] = function(analysed, place) {
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
      console.error('No [data-kern-role=document-body]');
    }
  };

  K.rules['[data-kern-role=document-aside]'] = function(analysed, place) {
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
      this
        .each(function() {
          
          var $s = $(this),
              script = {
                runs :    $s.hasClass('kern-common') || ($s.hasClass('kern-client') && !onServer) || ($s.hasClass('kern-server') && onServer),
                content : $s.html(),
                type :    /template/i.test($s.attr('type')) ? 'templates' : 'scripts',
                id :      $s.attr('id'),
                src :     $s.attr('src')
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

          // console.info('adding '+ script.type, script.id, script.runs);
          analysed[script.type][name] = script;

        });

    }
    else {
      console.info('Place scripts', analysed);
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
        _.each(analysed.scripts, function(script, k) {
          console.info('script '+ k, script);
          if (analysed.src) {
            // TODO: create script tag??
          }
          else {
            script.error = K.eval(script.content, analysed);
            if (script.error) console.error(script.error);
          }
        });
      }
    }
    // this.remove();
  };

  K.rules['[data-kern-role=data-collection]'] = function(analysed, place) {
    if (!place) { // read the stuff
      if (!onServer) return;

      this.each(function(){
        var $col = $(this);
        var elId = $col.attr('id');
        if (!elId) return;//throw new Error('Missing id attribute for the collection');
        // var C = eval($col.data('kern-collection') || 'Backbone.Collection');
        var props = $col.data('kern-model-properties').split(/[\s]+/);
        var modelSelector = $col.data('kern-model-selector') || 'li:not(li li)';
        var c = analysed[elId] || (analysed[elId] = []);
        $(modelSelector, this).each(function(){
          var $mod = $(this);
          var m = {};
          _.each(props, function(prop){
            if (!prop) return;
            var selector = $col.data('kern-model-property-'+ prop +'-selector') || '.'+prop;
            var value;
            var transform = $col.data('kern-model-property-'+ prop +'-transform');
            switch (transform) {
              case 'duration':
                value = getDuration.call($mod[0], selector);
                break;
              case 'list':
                value = getList.call($mod[0], selector);
                break;
              case 'html':
                value = $(selector, $mod).html();
                break;
              default:
                value = getText.call($mod[0], selector);
            }
            m[prop] = value;
            // console.info('Prop: '+prop+', value: ', value);
          });
          c.push(m);
        });
        // console.info('read: analysed.'+elId+' = ', c);

      });
    }
    else { // write the stuff

      console.info('Analysed:', !_.isUndefined(analysed.tasks), K.views);//, _.keys(analysed).join(', '));
      this.each(function(){
        var $col = $(this);
        var elId = $col.attr('id');
        if (!elId) {
          // throw new Error('Missing id attribute for the collection');
          return;
        }
        var c = analysed[elId] || (analysed[elId] = []);
        var V = eval($col.data('kern-model-view') || 'Backbone.View');
        console.info('View for model', typeof V, V);
        if (_.isUndefined(V)){
          // throw new Error('Could not find the View');
          return;
        }
        // var props = $col.data('kern-model-properties').split(/[\s]+/);
        var modelSelector = $col.data('kern-model-selector') || 'li:not(li li)';
        $(modelSelector, this).each(function(i, k){
          // var $mod = $(this);
          // $mod.html((!onServer ? 'client' : 'server'));
          var v = new V({
            el: this,
            data: c[i]
          });
          v.render();
        });
        console.info('write: analysed.'+elId+' = ', c);

      });

    }
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
  	
    // Content
  });
};

onServer ? module.exports = Content : window.KernContent = Content;

})();