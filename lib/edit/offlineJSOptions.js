// Configure offline/online detection
// Requires: http://github.hubspot.com/offline/docs/welcome/

Offline.options = { // jshint ignore:line
    checks: {
        image: {
            url: function() {
                return 'http://esri.github.io/offline-editor-js/tiny-image.png?_=' + (Math.floor(Math.random() * 1000000000));
            }
        },
        active: 'image'
    }
};