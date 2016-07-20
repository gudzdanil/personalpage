'use strict';

var jeapieVersion = "0.2.0";
var hostUrl = 'https://go.jeapie.com';
var app_key = 'a172df3b19b917b8df17df10ca90fa37';
var pushId;
var deviceId;
var redirectUrl = '/';
var logging = true;
var appDomain = 'https://platon.ua';
var tokens = self.tokens = getTokens();
var lastTokenIndex = -1;

self.triggerPush = pushFunc;

function getSubscription(index) {
    return Promise.resolve({subscriptionId: tokens[index]});
}

function pushFunc(event, index) {
    var url = hostUrl + "/api/v2/web/message?app_key=" + app_key;
    getSubscription(index).then(function (subscription) {
        var subscriptionId = null;
        if ('subscriptionId' in subscription) {
            subscriptionId = subscription.subscriptionId;
        } else {
            subscriptionId = subscription.endpoint;
        }
        subscriptionId = endpointWorkaround(subscriptionId);

        return fetch(url + '&token=' + subscriptionId, {
            method: 'get'
        }).then(function (response) {
            if (response.status !== 200) {
                if (logging) console.log('Looks like there was a problem. Status Code: ' + response.status);
                sendErrorToJeapie({
                    errorCode: response.status,
                    errorMessage: response.statusText
                }, subscriptionId);
                return;
            }

            return response.json().then(function (result) {
                var needToBrake = false;
                if (result.error || !result || result.length == 0) {
                    if (logging) console.log('The API returned an error.');
                    sendErrorToJeapie('The API returned an error.', subscriptionId);
                    needToBrake = true;
                }

                if (needToBrake)
                    return;

                pushId = result.pushId;
                deviceId = result.deviceId;
                redirectUrl = result.redirectUrl;

                var title = result.title;
                var message = result.body;
                var icon = generateIconUrl(result.icon, redirectUrl, deviceId, pushId);
                var notificationTag = result.tag;

                return self.registration.showNotification(title, {
                    body: message,
                    icon: icon,
                    tag: notificationTag,
                    vibrate: [200, 100, 200, 100, 200, 100, 200],
                    data: {
                        pushId: pushId,
                        deviceId: deviceId,
                        redirectUrl: redirectUrl
                    }
                });
            });
        }).catch(function (err) {
            if (logging) console.log('Unable to retrieve data', err.message);
            sendErrorToJeapie(err.message, subscriptionId);
        });
    });
}
function clickFunc(event) {
    var url = hostUrl + "/api/v2/web/browser?app_key=" + app_key;

    var pushData = event.notification.data;
    if (pushData && pushData.pushId && pushData.deviceId && pushData.redirectUrl) {
        pushId = pushData.pushId;
        deviceId = pushData.deviceId;
        redirectUrl = pushData.redirectUrl;
    } else {
        var iconURL = event.notification.icon;
        if (iconURL && iconURL.indexOf("?") > -1) {
            var queryString = iconURL.split("?")[1];
            var params = parseQueryString(queryString);

            if (typeof params.jeapiePush[0] != 'undefined')
                pushId = params.jeapiePush[0];
            if (typeof params.jeapieDevice[0] != 'undefined')
                deviceId = params.jeapieDevice[0];
            if (typeof params.jeapieUrl[0] != 'undefined')
                redirectUrl = params.jeapieUrl[0];
        }
    }

    if (typeof pushId != 'undefined' && typeof deviceId != 'undefined') {
        fetch(url + '&data=' + (JSON.stringify(
                {
                    type: 'open',
                    device_id: deviceId,
                    value: pushId,
                    time: Math.floor(Date.now() / 1000)
                })),
            {
                method: 'get'
            }).then(function (response) {
            if (logging) console.log(response);
        }).catch(function (err) {
            if (logging) console.log(err);
        });
    }

    event.notification.close();

    event.waitUntil(
        clients.matchAll({
            type: "window"
        }).then(function (clientList) {
            for (var i = 0; i < clientList.length; i++) {
                var client = clientList[i];
                if (client.url == '/' && 'focus' in client)
                    return client.focus();
            }
            if (clients.openWindow) {
                if (typeof redirectUrl == 'undefined') {
                    redirectUrl = appDomain;
                }
                if (logging) console.log('User has been redirected to ' + redirectUrl);
                return clients.openWindow(redirectUrl);
            }
        })
    );

}

function generateIconUrl(iconUrl, redirectUrl, deviceId, pushId) {
    var delimiter = iconUrl.indexOf("?") > -1 ? '&' : '?';
    return iconUrl + delimiter + 'jeapieUrl=' + encodeURIComponent(redirectUrl) + '&jeapieDevice=' + deviceId + '&jeapiePush=' + pushId;
}

function parseQueryString(queryString) {
    var qd = {};
    queryString.split("&").forEach(function (item) {
        var parts = item.split("=");
        var k = parts[0];
        var v = decodeURIComponent(parts[1]);
        (k in qd) ? qd[k].push(v) : qd[k] = [v,]
    });
    return qd;
}

function sendErrorToJeapie(error, token) {
    if (typeof error != 'string')
        error = JSON.stringify(error);

    var errorUrl = hostUrl + '/api/v2/web/logworkerserrors?app_key=' + app_key + '&token=' + token + '&error=' + error + '&time=' + Math.floor(Date.now() / 1000);
    return fetch(errorUrl, {
        method: 'get'
    }).then(function (response) {
        if (logging) console.log(response);
    }).catch(function (err) {
        if (logging) console.log(err);
    });
}

function endpointWorkaround(subscriptionId) {
    if (~subscriptionId.indexOf('https://android.googleapis.com/gcm/send')) {
        var token = subscriptionId.split("https://android.googleapis.com/gcm/send/");
        return token[1];
    } else {
        return subscriptionId;
    }
}

function getTokens() {
    return [];
}