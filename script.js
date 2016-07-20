var globalSW = null;
navigator.serviceWorker.register('cache-worker.js', {
    scope: '.'
}).then(function (registration) {
    navigator.serviceWorker.ready.then(function () {
        globalSW = registration;
        $(document.body).removeClass('loading');
    });
});


function startPushing() {
    if (!globalSW) {
        return;
    }
    for (var i = 0; i < globalSW.tokens.length; i++) {
        globalSW.triggerPush(null, i);
    }
}