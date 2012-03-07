(function(){


var onServer    = typeof window == 'undefined';
var _           = onServer ? require('underscore')._ : window._;
var Content     = {};
var rulesObj    = {};
var AJAXLinkSelector = 'a[href^="/"]:not([href^="//"])';

Content.extensionName = 'KernContent';


console.info('......................................');

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

  /**
   * Parsing rules object
   * TODO: implement it...
   */
  // function ParsingRule(selector, cb, weight) {
  //   this.selector = selector;
  //   this.callback = cb;
  //   this.weight = weight || 0;
  // };

  // _.extend(ParsingRule.prototype, {
  //   selector: '*',
  //   weight: 0,
  //   initialize: function() {},

  //   callback: function(analysed, place) { },
  //   'do': function(_html, analysed, place) {
  //     return this.callback.call($(this.selector, $html), analysed, place);
  //   }
  // });

  // function ParsingRules(_html) {
  //   this.length = this.rules.length;
  //   this.$html = $html || K.$('*:first');
  // }

  // _.extend(ParsingRules.prototype, {
  //   length: 0,
  //   rules: [],
  //   add: function(rules) {
  //     var self = this;
  //     if (!_.isArray(rules)) {
  //       rules = [rules];
  //     }
  //     _.each(rules, function(rule){
  //       self.rules.push(new ParsingRule(rule.selector, rule.cb, rule.weight));
  //       self.length = self.rules.length;
  //     });
  //   },
  //   analyse: function() {
  //     _.each(this.rules, function(rule) {
  //       rule['do'](_html, analysed, false);
  //     });
  //   },
  //   place: function() {
  //     _.each(this.rules, function(rule) {
  //       rule['do'](_html, analysed, true);
  //     });
  //   },
  //   html: function(selfToo, ieComments) {
  //     var p = [], $h = this.$html;
  //     if (selfToo) {
  //       p.push('<'+ $h[0].nodeName);
  //       _.each($h[0].attributes, function(attr) {
  //         p.push(attr.nodeName +'="'+$h.attr(attr.nodeName)+'"');
  //       });
  //       p.push('>');
  //     }

  //     p.push($h.html());
      
  //     if (selfToo) p.push('</'+ $h[0].nodeName +'>');
  //     return p.join("\n");
  //   }
  // });

  // Content.ParsingRules = ParsingRules;



  K.bind('contentchange', function(CE) {
    console.info(CE.id +' changed', CE.attributes.scripts);
    rulesObj.script.call(K, CE.attributes, true);
  });



  /**
   * Finds references (from href, src attributes) and collect them
   */
  rulesObj['[src]:not(base),[href]:not(base)'] = function(analysed, place) {
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


  /**
   * DEPRECATE
   */
  rulesObj['[data-kern-role=static-dev-scripts]'] = function(analysed, place) {
    this.remove();
  };


  /**
   * Finds or place the title of content
   */
  rulesObj['[data-kern-role=document-title], .page-title, title'] = function(analysed, place) {
    if (!place) {
      analysed.title = this.last().text();
    } else if (this.length) {
      this.text(analysed.title);
    }
  };


  /**
   * Finds or place the content main text (body)
   */
  rulesObj['[data-kern-role=document-body], body'] = function(analysed, place) {
    analysed.regions = analysed.regions || {};
    if (!place) {
      // console.info('Found '+ this.last().html());
      var $body = this.last().clone();
      // $('script,style', $body).remove();
      analysed.regions.main = $body.html();
    }
    else if (this.length) {
      this.last().html(analysed.regions.main);
      if (!onServer) {
        $(AJAXLinkSelector, this).each(K.AJAXLinkAttach);
      }
    } else {
      console.error('No [data-kern-role=document-body]');
    }
  };


  /**
   * Finds, extracts side information in the content
   */
  rulesObj['[data-kern-role=document-aside]'] = function(analysed, place) {
    analysed.regions = analysed.regions || {};
    if (!place) {
      analysed.regions.aside = this.html();
    } else if (this.length) {
      this.html(analysed.regions.aside);
      $(AJAXLinkSelector, this).each(K.AJAXLinkAttach);
    }
  };


  /**
   * Parses and applies OpenGraph meta tags
   */
  rulesObj['meta[property^="og:"]'] = function(analysed, place) {
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


  /**
   * Finds libraries required by the content
   * TODO: Rewrite
   */
  rulesObj['[type="kern/lib"]'] = function(analysed, place) {
    analysed.libs = analysed.libs || {};
    if (!place) {
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
    }
  };


  /**
   * Parses and applies the content inlined scripts and templates
   */
  rulesObj['script'] = function(analysed, place) {
    // console.info('Looking for scripts', analysed, place);
    if (!place) {
      console.info('Already analysed', analysed);
      analysed.scripts = analysed.scripts || {};
      analysed.templates = analysed.templates || {};
      this
        .each(function() {
          var $s = $(this),
              runsOn = $s.hasClass('kern-common') ? 'common' : ($s.hasClass('kern-server') ? 'server' : 'client'),
              script = {
                runsOn :  runsOn,
                content : $s.html(),
                type :    /template/i.test($s.attr('type')) ? 'templates' : 'scripts',
                id :      $s.attr('id'),
                src :     $s.attr('src')
              },
              name = (script.src ? script.src : (script.id ? script.id : script.type + _.toArray(analysed.scripts).length))
          ;

          if (script.type == 'templates') {
            K.assets.templates[name] = script.content;
          }
          else if (runsOn == 'common' || (runsOn == 'client' && !onServer) || (runsOn == 'server' && onServer)) {
            console.group('Script in '+ (analysed.id || analysed.title) +': '+ script.id);
            
            var returned = K.eval(script.content, _.extend(analysed, {
              scriptId: name
            }));

            if (_.isUndefined(returned)) {
              try {
                JSON.stringify(returned);
                script.error = returned;
              }
              catch (err) {
                script.error = {error: 'script error'};
              }
            }
            // delete script.error;
            // if (script.error) console.error(script);
            delete analysed.scriptId;
            
            console.groupEnd();
          }

          analysed[script.type][name] = script;//.error ? script.error : script;


        });

    }
    else {
      // console.info('Place scripts', analysed);
      if (analysed.templates) {
        // _.each(analysed.templates, function(tmpl) {
        //   if (!tmpl) return;
          
        //   K.assets.templates[tmpl.id] = analysed.templates[tmpl.id] = tmpl.content;
        //   var $tmpl = K.$('#'+tmpl.id);
        //   if ($tmpl.length) {
        //     $tmpl.html(tmpl.content);
        //     return;
        //   }
        //   var scriptTag = '<script type="text/template" id="'+ tmpl.id +'">'+ tmpl.content +'</script>';
        //   K.$('.kern-templates').append(scriptTag);
        // });
      }

      if (analysed.scripts) {
        _.each(analysed.scripts, function(script, k) {
          if (analysed.src) {
            // TODO: create script tag??
            var $src = K.$('[src^="'+tmpl.src+'"]');
            if ($src.length) return;
            var scriptTag = '<script type="text/javascript" id="'+ tmpl.id +'" src=""> </script>';
            K.$('.kern-scripts').append(scriptTag);
          }
          else {
            // script.error = K.eval(script.content, analysed);
            console.group('Script in '+ analysed.id +': '+ script.id);
            script.error = K.eval(script.content, _.extend(analysed, {
              scriptId: script.id
            }));
            if (script.error) console.error(script.error.message, script.error.stack);
            delete analysed.scriptId;
            console.groupEnd();
          }
        });
      }
    }
    // this.remove();
  };


  /**
   * Parses and applies inlined data collections 
   * This part HAS to come after the content script (rulesObj['script'])
   */
  rulesObj['[data-kern-role=data-collection]'] = function(analysed, place) {
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
        var serializer;
        if ($col.data('kern-model-serializer')) {
          serializer = analysed.scripts[$col.data('kern-model-serializer')];
          console.info('Serializer found', $col.data('kern-model-serializer'), serializer);
        }

        $(modelSelector, this).each(function(){
          var $mod = $(this);
          var m = {};

          if (!_.isFunction(serializer)) {
            _.each(props, function(prop){
              if (!prop) return;
              var selector = $col.data('kern-model-property-'+ prop +'-selector') || '.'+prop;
              var attr = $col.data('kern-model-property-'+ prop +'-attribute');
              var transform = $col.data('kern-model-property-'+ prop +'-transform');
              
              var value;
              if (!attr) {
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
              }
              else {
                value = $(selector, $mod[0]).attr(attr);
              }
              

              // console.info('selector', selector, 'attr', attr, 'transform', transform, '=>', value);
              m[prop] = value;
              // console.info('Prop: '+prop+', value: ', value);
            });
          }
          else {
            // console.info("$col.data('kern-model-serializer')", serializer);
          }
          c.push(m);
        });

        analysed.data = analysed.data || (analysed.data = {});
        analysed.data[elId] = c;
        console.info('read: analysed.'+elId+' = ', c);

      });
    }
    else { // write the stuff
      // console.info('Writing collection data', analysed);
      this.each(function(){
        var $col = $(this);
        var elId = $col.attr('id');
        if (!elId) {
          throw new Error('Missing id attribute for the collection');
          return;
        }
        var c = analysed[elId] || (analysed[elId] = []);
        var V = eval($col.data('kern-model-view') || 'Backbone.View');

        var Collection = eval($col.data('kern-collection'));
        var Model = eval($col.data('kern-model'));
        var ModelView = eval($col.data('kern-model-view'));
        var View = eval($col.data('kern-view'));
        

        console.info('Collection, Model, ModelView, View', Collection, Model, ModelView, View);


        if (!_.isFunction(View) && !_.isFunction(ModelView)){
          console.info('No way to render');
          return;
        }

        if (_.isFunction(View)) {
          var v = new View({
            el: this,
            data: c,
            modelSelector: modelSelector
          });
          if (!onServer) window.collectionView = v;
          return;
        }

        var modelSelector = $col.data('kern-model-selector') || 'li:not(li li)';
        $(modelSelector, this).each(function(i, k){
          var mv = new ModelView({
            el: this,
            data: c[i]
          });
          mv.render();
        });

        console.info('write: analysed.'+elId+' = ', c);

      });

    }
  };


  /**
   * Finds attached styles in content
   */
  rulesObj['style, link[rel="stylesheet"]'] = function(analysed, place) {
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
    }
  };


  /**
   * Strips element from content
   */
  rulesObj['.kern-remove'] = function(analysed) {
    this.remove();
  };


  _.extend(K.rules, rulesObj);
  // var rules = new ParsingRules();
  // var a = [];
  // _.each(K.rules, function(cb, selector){
  //   // rules.add({
  //   //   selector: selector,
  //   //   cb: cb
  //   // });
  //   a.push({
  //     selector: selector,  
  //     cb: cb,
  //     weight: a.length
  //   });
  // });
  // rules.add(a);
  // console.info('Content html parsing rules', rules.html(true));
};

onServer ? module.exports = Content : window.KernContent = Content;

})();