// Register the ServiceWorker
navigator.serviceWorker.register('cache-worker.js', {
    scope: '.'
}).then(function(registration) {
    // The service worker has been registered!
});

// Listen for claiming of our ServiceWorker
navigator.serviceWorker.addEventListener('controllerchange', function(event) {
    // Listen for changes in the state of our ServiceWorker
    navigator.serviceWorker.controller.addEventListener('statechange', function() {
        // If the ServiceWorker becomes "activated", let the user know they can go offline!
        if (this.state === 'activated') {
            // Show the "You may now use offline" notification
            document.getElementById('offlineNotification').classList.remove('hidden');
        }
    });
});

document.querySelector('#randomButton').addEventListener('click', function() {
    var image = document.querySelector('#logoImage');
    var currentIndex = Number(image.src.match('c-asteroids-([1-6])')[1]);
    var newIndex = getRandomNumber();

    // Ensure that we receive a different image than the current
    while (newIndex === currentIndex) {
        newIndex = getRandomNumber();
    }

    image.src = 'c-asteroids-' + newIndex + '.png';

    function getRandomNumber() {
        return Math.floor(Math.random() * 6) + 1;
    }
});