(function(common){
  
  var onServer   = typeof exports != 'undefined',
      settings   = {},
      defaults   = {},
      _          = onServer ? require('underscore')._ : window._,
      $          = onServer ? require('jQuery') : window.jQuery,
      _f         = function() {}
      console    = _.isUndefined(console) ? {info: _f, log: _f, error: _f} : console
      storage    = {}
  ;

  function support() {
    if (onServer) return false;
    return !_.isUndefined(window.localStorage);//(!onServer && !window.localStorage);
    // https://developer.mozilla.org/en/DOM/Storage
    // This algorithm is an exact imitation of the localStorage object, but making use of cookies.
    // if (!onServer && !window.localStorage) {  
    //   Object.defineProperty(window, "localStorage", new (function () {  
    //     var aKeys = [], oStorage = {};  
    //     Object.defineProperty(oStorage, "getItem", {  
    //       value: function (sKey) { return sKey ? this[sKey] : null; },  
    //       writable: false,  
    //       configurable: false,  
    //       enumerable: false  
    //     });  
    //     Object.defineProperty(oStorage, "key", {  
    //       value: function (nKeyId) { return aKeys[nKeyId]; },  
    //       writable: false,  
    //       configurable: false,  
    //       enumerable: false  
    //     });  
    //     Object.defineProperty(oStorage, "setItem", {  
    //       value: function (sKey, sValue) {  
    //         if(!sKey) { return; }  
    //         document.cookie = escape(sKey) + "=" + escape(sValue) + "; path=/";  
    //       },  
    //       writable: false,  
    //       configurable: false,  
    //       enumerable: false  
    //     });  
    //     Object.defineProperty(oStorage, "length", {  
    //       get: function () { return aKeys.length; },  
    //       configurable: false,  
    //       enumerable: false  
    //     });  
    //     Object.defineProperty(oStorage, "removeItem", {  
    //       value: function (sKey) {  
    //         if(!sKey) { return; }  
    //         var sExpDate = new Date();  
    //         sExpDate.setDate(sExpDate.getDate() - 1);  
    //         document.cookie = escape(sKey) + "=; expires=" + sExpDate.toGMTString() + "; path=/";  
    //       },  
    //       writable: false,  
    //       configurable: false,  
    //       enumerable: false  
    //     });  
    //     this.get = function () {  
    //       var iThisIndx;  
    //       for (var sKey in oStorage) {  
    //         iThisIndx = aKeys.indexOf(sKey);  
    //         if (iThisIndx === -1) { oStorage.setItem(sKey, oStorage[sKey]); }  
    //         else { aKeys.splice(iThisIndx, 1); }  
    //         delete oStorage[sKey];  
    //       }  
    //       for (aKeys; aKeys.length > 0; aKeys.splice(0, 1)) { oStorage.removeItem(aKeys[0]); }  
    //       for (var iCouple, iKey, iCouplId = 0, aCouples = document.cookie.split(/\s*;\s*/); iCouplId < aCouples.length; iCouplId++) {  
    //         iCouple = aCouples[iCouplId].split(/\s*=\s*/);  
    //         if (iCouple.length > 1) {  
    //           oStorage[iKey = unescape(iCouple[0])] = unescape(iCouple[1]);  
    //           aKeys.push(iKey);  
    //         }  
    //       }  
    //       return oStorage;  
    //     };  
    //     this.configurable = false;  
    //     this.enumerable = true;  
    //   })());  
    // }
  }
  
  common.extensionName = 'KernLocalStorage';
  common.extender = function() {
    if (_.isUndefined($)) throw new Error('jQuery not found');
    
    this.storage = storage;
  };

  var unsupported = new Error('No storage solution... you are screwed');

  storage.set = function(name, value) {
    if (!support()) throw unsupported;
    if (_.isUndefined(arguments[1])) {
      _.each(arguments[0], function(val, key) {
        storage.set(key, val);
      });
      return;
    }
    
    window.localStorage[name] = JSON.stringify(value);
    
  };
  storage.get = function(name) {
    if (!support()) throw unsupported;
    return (window.localStorage[name] ? JSON.parse(window.localStorage[name]) : undefined);
  };
  storage.delete = function(name) {
    if (!support()) throw unsupported;
    window.localStorage.removeItem(name);
  };
  storage.clear = function() {
    if (!support()) throw unsupported;
    window.localStorage.clear();
  };
  

  _.extend(
    common, 
    onServer ? require('./localstorage.server.js') : {},
    storage
  );

})(typeof exports == 'undefined' ? this.KernLocalStorage = {} : exports);