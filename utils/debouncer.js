define([],function(){
    return {

        /**
         * Activates the orientation listener and listens for native events.
         * Handle orientation events to allow for resizing the map and working around
         * 3rd party library bugs related to how and when the view settles after such an event
         */
        setOrientationListener: function(delay,callback){
            var supportsOrientationChange = "onorientationchange" in window,
                orientationEvent = supportsOrientationChange ? "orientationchange" : "resize";

            window.addEventListener(orientationEvent, this.debounceMap(function(){
                callback();
            },delay).bind(this), false);
        },

        /**
         * Minimize the number of times window readjustment fires a function
         * http://davidwalsh.name/javascript-debounce-function
         * @param func
         * @param wait
         * @param immediate
         * @returns {Function}
         */
        debounceMap: function (func, wait, immediate) {
            var timeout;
            return function() {
                var context = this, args = arguments;
                clearTimeout(timeout);
                timeout = setTimeout(function() {
                    timeout = null;
                    if (!immediate) func.apply(context, args);
                }, wait);
                if (immediate && !timeout) func.apply(context, args);
            };
        }
    }
})