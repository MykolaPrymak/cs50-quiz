// Avoid `console` errors in browsers that lack a console.
(function() {
    var method;
    var noop = function () {};
    var methods = [
        'assert', 'clear', 'count', 'debug', 'dir', 'dirxml', 'error',
        'exception', 'group', 'groupCollapsed', 'groupEnd', 'info', 'log',
        'markTimeline', 'profile', 'profileEnd', 'table', 'time', 'timeEnd',
        'timeStamp', 'trace', 'warn'
    ];
    var length = methods.length;
    var console = (window.console = window.console || {});

    while (length--) {
        method = methods[length];

        // Only stub undefined methods.
        if (!console[method]) {
            console[method] = noop;
        }
    }
}());

// Place any jQuery/helper plugins in here.



(function(global) {
    global.StorageApi = function(storageKey) {
        var supported = global.localStorage && global.localStorage.getItem && JSON && JSON.parse;
        var data = {};

        if (supported) {
            try {
                data = JSON.parse(global.localStorage.getItem(storageKey)) || {};
            } catch(e) {
                console.log(e);
            }
        }

        return {
            get: function(key) {
                return data[key];
            },
            set: function(key, value) {
                var old = data[key];

                data[key] = value;

                global.localStorage.setItem(storageKey, JSON.stringify(data));

                return old;
            }
        };
    };
}(window));