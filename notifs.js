function in_array(e, i, t) {
    var a, n = false;
    t = !!t;
    for (a in i)if (t && i[a] === e || !t && i[a] == e) {
        n = true;
        break
    }
    return n
}
var Gravitec = window.Gravitec || {
        sdkVersion: "0.0.1",
        appKey: "5b59a854bfc4a43b998961f5d3fc401f",
        hostUrl: "https://go.jeapie.com/api/v2/web/browser/",
        logging: true,
        initParams: null,
        jeapiePushDb: null,
        messageListener: null,
        // autoRegister: {{auto_register}},
        subdomainName: "ubr",
        jeapieMode: null,
        // isHttp: {{isHttp}},
        webSiteDomain: "http://gudz.me",
        autoRegister: true,
        deviceToken: null,
        safariFirstPrompt: null,
        isGravitecSubdomain: true,
        safariID: "web.web.jeapie.236125cccf364d4bbc73683ae999eb40",
        api: {
            subscribe: {
                url: "api/sites/followers", method: "POST"
            },
            unsubscribe: {
                url: "api/sites/followers", method: "DELETE"
            },
            tag: {
                'set': {
                    url: "api/sites/followers/tags", method: "PUT"
                },
                removeAll: {
                    url: "api/sites/followers/tags", method: "DELETE"
                },
                remove: {
                    url: "api/sites/followers/tag", method: "DELETE"
                },
                add: {
                    url: "api/sites/followers/tags", method: "POST"
                }
            }
        },
        _noop: function () {
        },
        _log: function (e) {
            return Gravitec.logging && console.log(e);
        },
        /**
         * Runs array of methods of Gravitec service
         * @param methodNames {Array<Function|Array<Function, ...args>>}
         */
        _processPushes: function (methodNames) {
            for (var i = 0; i < methodNames.length; i++) {
                Gravitec.push(methodNames[i]);
            }
        },
        /**
         * executes method
         * @param method {Function | Array<Function, ...args>}
         */
        push: function (method) {
            if ("function" == typeof method)
                method();
            else {
                var i = method.shift();
                Gravitec[i].apply(null, method);
            }
        },
        /**
         *
         * @param initParams
         */
        init: function (initParams) {
            if (Gravitec._checkBrowser()) {
                if (typeof initParams != "undefined") {
                    Gravitec.initParams = initParams;

                    if (Gravitec.initParams._createLineWidget && Gravitec.initParams._createLineWidget.init)
                        Gravitec._subscribeWithWidget(false, true);
                    if (Gravitec.initParams._createButton)
                        Gravitec._subscribeWithWidget(true);
                    Gravitec.autoRegister = Gravitec.initParams.autoRegister;
                    window.addEventListener("load", function () {
                        if (Gravitec.gravitecMode === "chrome") {
                            if (Gravitec.isHttp) {
                                if (Gravitec.autoRegister) {
                                    Gravitec._subscribeWithWidget(false, false, true);
                                }
                                return;
                            }
                            Gravitec._addManifest();
                            Gravitec._initWorker();
                        }
                        if (Gravitec.autoRegister) {
                            Gravitec.getSubscription(function (subscription) {
                                if (subscription) {
                                    return Gravitec._isSubscriptionChanged(subscription)
                                }
                                else if (Gravitec.gravitecMode === 'chrome') {
                                    Gravitec._subscribe(function (subscription) {
                                        Gravitec._putValueToDb("Ids", {
                                            type: "SubscriptionId",
                                            value: subscription
                                        });
                                        Gravitec._putValueToDb("Ids", {
                                            type: "deviceId",
                                            value: Gravitec.md5(subscription)
                                        });
                                        Gravitec._registerNewUser(subscription, function () {
                                            Gravitec.createOnResultEvent(subscription)
                                        });
                                    });
                                }
                            });
                        }
                    });
                }
            }

        },

        _addManifest: function () {
            var manifest = document.createElement("link");
            manifest.rel = "manifest";
            manifest.href = "/manifest.json";
            document.head.appendChild(manifest);
        },
        _createOnResultEvent: function (data) {
            Gravitec.deviceToken = data;
            var event = new Event("gravitecresult");
            document.dispatchEvent(event);
        },
        afterSubscription: function (callback) {
            document.addEventListener("gravitecresult", function (data) {
                return callback(Gravitec.deviceToken)
            }, false);
        },
        registerUserForPush: function (callback) {
            if (Gravitec.gravitecMode === 'safari') {
                var permission = window.safari.pushNotification.permission(Gravitec.safariID);
                Gravitec._checkRemotePermission(
                    permission, function (permiss) {
                        if (permiss && Gravitec.safariFirstPrompt) {
                            Gravitec._createOnResultEvent(permiss);
                            Gravitec.safariFirstPrompt = null;
                        }
                    }
                );
            }
            else {
                if (Gravitec.subdomainName) {
                    Gravitec._registerHttp();
                }
                else {
                    Gravitec.getSubscription(function (subscription) {
                        if (subscription) {
                            Gravitec._isSubscriptionChanged(subscription);
                        }
                        else {
                            Gravitec._subscribe(function (subscription) {
                                Gravitec._putValueToDb("Ids", {
                                    type: "SubscriptionId",
                                    value: subscription
                                });
                                Gravitec._registerNewUser(subscription, function (data) {
                                    if (data) {
                                        Gravitec._createOnResultEvent(subscription);
                                        return callback(data);
                                    }
                                });
                            })
                        }
                    });
                }
            }
        },
        _initDb: function (callback) {
            if (Gravitec.gravitecPushDb) {
                return void callback();
            }
            var openRequest = indexedDB.open("gravitec_push_sdk_db", true);
            openRequest.onsuccess = function (event) {
                Gravitec.gravitecPushDb = event.target.result;
                callback();
            };
            openRequest.onupgradeneeded = function (event) {
                var db = event.target.result;
                db.createObjectStore("Ids", {keyPath: "type"});
                db.createObjectStore("HttpCreated", {keyPath: "type"})
            };
        },
        _getDbValue: function (objectStore, key, callback) {
            Gravitec._initDb(function () {
                Gravitec.gravitecPushDb.transaction(objectStore).objectStore(objectStore).get(key).onsuccess = callback;
            })
        },
        _getAllValues: function (objectStore, callback) {
            Gravitec._initDb(function () {
                var res = {};
                Gravitec.gravitecPushDb.transaction(objectStore).objectStore(objectStore).openCursor().onsuccess = function (event) {
                    var cursor = event.target.result;
                    if (cursor) {
                        res[cursor.key] = cursor.value.value;
                        cursor["continue"]();
                    }
                    else {
                        callback(res);
                    }
                }
            });
        },
        _putValueToDb: function (objectStore, obj) {
            Gravitec._initDb(function () {
                Gravitec.gravitecPushDb.transaction([objectStore], "readwrite").objectStore(objectStore).put(obj);
            });
        },
        _deleteDbValue: function (collection, key) {
            Gravitec._initDb(function () {
                Gravitec.gravitecPushDb.transaction([collection], "readwrite").objectStore(collection)["delete"](key)
            });
        },
        _initWorker: function () {
            if ("serviceWorker" in navigator) {
                navigator.serviceWorker.register("/push-worker.js").then(function () {
                    Gravitec._log("Worker registered");
                })["catch"](function (err) {
                    Gravitec._log(err);
                    return false;
                });
            }
        },
        _send: function (url, method, data, callback) {
            if ("chrome" == Gravitec.gravitecMode) {
                var ajaxOptions = {
                    method: method
                };
                if (data) {
                    ajaxOptions.body = JSON.stringify(data);
                }

                fetch(url, ajaxOptions).then(function (response) {
                    if (response.status !== 200) {
                        return void Gravitec._log("Looks like there was a problem. Status Code: " + response.status);
                    }
                    else {
                        return void response.json().then(function (json) {
                            Gravitec._log("data successfully sent");
                            if ("function" == typeof callback) {
                                callback(json);
                            }
                        });
                    }
                })["catch"](function (e) {
                    Gravitec._log("Fetch Error :-S", e)
                });
            } else {
                var o = new XMLHttpRequest;
                o.open(method, url, true);
                o.onreadystatechange = function () {
                    if (4 == o.readyState) {
                        if (200 !== o.status) {
                            Gravitec._log("Looks like there was a problem. Status Code: " + o.status);
                            return;
                        }

                        Gravitec._log("data successfully sent");
                        if ("function" == typeof callback) {
                            return callback(o.responseText)
                        }
                    }
                };
                o._send(null);
            }
        },
        _getGetUrlWithObject: function (url, obj) {
            return url + "?app_key=" + Gravitec.appKey + "&data=" + JSON.stringify(obj);
        },
        _checkRemotePermission: function (permiss, callback) {
            if ("default" === permiss.permission) {
                Gravitec.safariFirstPrompt = true;
                window.safari.pushNotification.requestPermission(
                    "https://go.gravitec.com/safari/5b59a854bfc4a43b998961f5d3fc401f",
                    Gravitec.safariID,
                    {},
                    function (permiss) {
                        Gravitec._checkRemotePermission(permiss, callback)
                    }
                );
            } else {
                if ("denied" === permiss.permission) {
                    return callback();
                }
                if ("granted" === permiss.permission) {
                    Gravitec._isSubscriptionChanged(permiss.deviceToken);
                    return callback(permiss.deviceToken);
                }
            }
        },
        _registerHttp: function () {
            if ("safari" == Gravitec.gravitecMode) {
                Gravitec._checkRemotePermission(window.safari.pushNotification.permission(Gravitec.safariID), function (permiss) {
                    if (permiss && Gravitec.safariFirstPrompt) {
                        Gravitec._createOnResultEvent(permiss);
                        Gravitec.safariFirstPrompt = null;
                    }
                });
            } else {
                if (!Gravitec.isHttp || null === Gravitec.subdomainName || !Gravitec.isPushManagerSupported()) {
                    return;
                }
                var left = void 0 != window.screenLeft
                        ? window.screenLeft :
                        screen.left,
                    top = void 0 != window.screenTop
                        ? window.screenTop
                        : screen.top,
                    width = window.innerWidth
                        ? window.innerWidth :
                        document.documentElement.clientWidth
                            ? document.documentElement.clientWidth
                            : screen.width,
                    height = window.innerHeight
                        ? window.innerHeight
                        : document.documentElement.clientHeight
                        ? document.documentElement.clientHeight
                        : screen.height,
                    w = 600,
                    h = 350,
                    l = width / 2 - w / 2 + left,
                    t = height / 2 - h / 2 + top,
                    subWindow = window.open("https://" + Gravitec.subdomainName + ".gravitec.net/subscribe?utm_source=" + Gravitec.subdomainName, "_blank", "scrollbars=yes, width=" + w + ", height=" + h + ", top=" + t + ", left=" + l);
                if (subWindow) {
                    subWindow.focus();
                    Gravitec._createMessageListener();
                }
            }
        },
        _isSubscribed: function (callback) {
            if ("safari" === Gravitec.gravitecMode) {
                var permission = window.safari.pushNotification.permission(Gravitec.safariID).permission;
                return callback("granted" == permission);
            }
            Gravitec.getSubscription(function (subscription) {
                return callback(!!subscription);
            });
        },
        getSubscription: function (callback) {
            if ("chrome" == Gravitec.gravitecMode) {
                if (Gravitec.isHttp) {
                    Gravitec._getDbValue("Ids", "SubscriptionId", function (subscription) {
                        return subscription.target.result ? callback(subscription.target.result.value) : callback()
                    });
                }
                else {
                    navigator.serviceWorker.ready.then(function (serviceWorkerRegistration) {
                        serviceWorkerRegistration.pushManager.getSubscription().then(function (subscription) {
                            var subscriptionId;
                            if (subscription) {
                                if ("subscriptionId" in subscription) {
                                    subscriptionId = subscription.subscriptionId
                                }
                                else {
                                    subscriptionId = Gravitec.endpointWorkaround(subscription.endpoint);
                                }
                            }
                            return callback(subscriptionId);
                        })["catch"](function (e) {
                            Gravitec._log("Error during getSubscription()", e)
                        });
                    });
                }
            } else {
                var permission = window.safari.pushNotification.permission(Gravitec.safariID);
                Gravitec._checkRemotePermission(permission, function (permiss) {
                    if (permiss && Gravitec.safariFirstPrompt) {
                        Gravitec._createOnResultEvent(permiss);
                        Gravitec.safariFirstPrompt = null;
                    }
                });
            }
        },
        _isSubscriptionChanged: function (subscription) {
            Gravitec._getDbValue("Ids", "SubscriptionId", function (subscriptionFromDB) {
                if (subscriptionFromDB.target.result) {
                    if (subscriptionFromDB.target.result.value != subscription) {
                        var _sendObject = {
                            type: "token",
                            device_id: "chrome" == Gravitec.gravitecMode ? Gravitec.md5(subscriptionFromDB.target.result.value) : Gravitec.md5(subscriptionFromDB.target.result.value + Gravitec.appKey),
                            value: subscription,
                            time: Gravitec.getCurrentTimestamp()
                        };
                        var url = Gravitec._getGetUrlWithObject(Gravitec.hostUrl, _sendObject, true);
                        Gravitec._send(url, "get", false, function (response) {
                            if (response) {
                                Gravitec._createOnResultEvent(subscription);
                            }
                        });
                    }
                } else {
                    if ("safari" != Gravitec.gravitecMode) {
                        Gravitec._putValueToDb("Ids", {
                            type: "SubscriptionId",
                            value: subscription
                        });
                        Gravitec._registerNewUser(subscription, function (response) {
                            response && Gravitec._createOnResultEvent(subscription);
                        });
                    }
                }
            })
        },
        _subscribeWithWidget: function (e, i, t) {
            "chrome" != Gravitec.gravitecMode && "safari" != Gravitec.gravitecMode || (Gravitec.isHttp ? "chrome" == Gravitec.gravitecMode ? Gravitec._getDbValue("Ids", "SubscriptionId", function (a) {
                a.target.result ? Gravitec.isGravitecSubdomain && !Gravitec._checkCookie("gravitecPromptShowed") ? Gravitec._appendWidgets(e, i, t) : Gravitec._getDbValue("HttpCreated", "subscribedTime", function (a) {
                    if (a.target.result) {
                        var n = Gravitec.getCurrentTimestamp(), o = a.target.result.value, r = n - o;
                        r > 5184000 && Gravitec._appendWidgets(e, i, t)
                    }
                }) : Gravitec._appendWidgets(e, i, t)
            }) : "default" == window.safari.pushNotification.permission(Gravitec.safariID).permission && Gravitec._appendWidgets(e, i, t) : "chrome" == Gravitec.gravitecMode ? Gravitec.getSubscription(function (a) {
                a || Gravitec._appendWidgets(e, i, t)
            }) : "default" == window.safari.pushNotification.permission(Gravitec.safariID).permission && Gravitec._appendWidgets(e, i, t))
        },
        _appendWidgets: function (e, i, t) {
            if (t && Gravitec._createNativePrompt(), e && Gravitec._createButton(), i && Gravitec._createLine(), null === document.getElementById("gravitec-button-style")) {
                var a = document.getElementsByTagName("head")[0];
                var linkTag = document.createElement("link");
                linkTag.id = "gravitec-button-style";
                linkTag.rel = "stylesheet";
                linkTag.type = "text/css";
                linkTag.href = Gravitec.hostUrl + "styles/pushbutton.css";
                linkTag.media = "all";
                a.appendChild(linkTag);
            }
        },
        _createButton: function () {
            function e() {
                setInterval(function () {
                    var container = document.getElementById("gravitec-push-container");
                    container.className = container.className + " gravitec-shake-animated gravitec-shake";
                    setTimeout(function () {
                        container.className = "";
                    }, 1000);
                }, 90000);
            }

            function i() {
                document.getElementById("gravitec-push-tooltip").style.display = "block", document.getElementById("gravitec-push-dont-show").style.display = "block"
            }

            function t() {
                document.getElementById("gravitec-push-tooltip").style.display = "block"
            }

            function a() {
                document.getElementById("gravitec-push-tooltip").style.display = "none", setTimeout(function () {
                    document.getElementById("gravitec-push-dont-show").style.display = "none"
                }, 6000)
            }

            function n() {
                Gravitec._setCookie("dontShowButton", true, 7), Gravitec._removeWidget(["gravitec-push-container"])
            }

            if (!Gravitec._checkCookie("dontShowButton")) {
                Gravitec.initParams.tooltipText || (Gravitec.initParams.tooltipText = "Подпишитесь на наши обновления в один клик!");
                var o = document.createElement("button");
                o.id = "gravitec-push-button";
                var r = document.createElement("span");
                r.id = "gravitec-push-tooltip";
                var p = document.createTextNode(Gravitec.initParams.tooltipText);
                r.appendChild(p);
                var s = document.createElement("span");
                s.id = "gravitec-push-dont-show";
                var c = document.createTextNode("x");
                s.appendChild(c);
                var d = document.createElement("div");
                d.id = "gravitec-push-container", d.appendChild(o), d.appendChild(r), d.appendChild(s), Gravitec._checkCookie("firstSeen") ? (document.body.appendChild(d), e(), document.getElementById("gravitec-push-button").onmouseover = i, document.getElementById("gravitec-push-button").onmouseout = a, document.getElementById("gravitec-push-button").onclick = Gravitec._registerOnWidgetClick, document.getElementById("gravitec-push-dont-show").onclick = n) : setTimeout(function () {
                    document.body.appendChild(d), Gravitec._setCookie("firstSeen", true, 30);
                    var o = document.getElementById("gravitec-push-container");
                    o.className = o.className + " gravitec-animated gravitec-rollin", setTimeout(function () {
                        t()
                    }, 1000), setTimeout(function () {
                        a(), o.className = ""
                    }, 3000), e(), document.getElementById("gravitec-push-button").onmouseover = i, document.getElementById("gravitec-push-button").onmouseout = a, document.getElementById("gravitec-push-button").onclick = Gravitec._registerOnWidgetClick, document.getElementById("gravitec-push-dont-show").onclick = n
                }, 2000), Gravitec._createMessageListener()
            }
        },
        _createNativePrompt: function () {
            if (!Gravitec._checkCookie("dontShowPrompt")) {
                if (Gravitec.isMobileScreen())return Gravitec.initParams = {
                    _createLineWidget: {
                        init: true,
                        background: "#1ab394",
                        color: "#fff",
                        text: "Opt-in for notifications",
                        position: "bottom",
                        showbell: false,
                        showInsteadPrompt: true
                    }
                }, void Gravitec._createLine();
                var e = " wants to:", i = "  _send notifications", t = "Allow", a = "Block", n = document.createElement("div");
                n.id = "gravitec-prompt-widget", "ru" != Gravitec.getBrowserlanguage() && "uk" != Gravitec.getBrowserlanguage() || (e = " запрашивает разрешение на:", i = "  отправку оповещений", t = "Разрешить", a = "Блокировать", n.className = "gravitec-ru-block");
                var o = document.createElement("div");
                o.id = "gravitec-prompt-closer";
                var r = document.createElement("span");
                r.id = "gravitec-prompt-closer-char";
                var p = String.fromCharCode(10761), s = document.createTextNode(p);
                r.appendChild(s), o.appendChild(r);
                var c = document.createElement("div");
                c.id = "gravitec-prompt-domain-name";
                var s = document.createTextNode(document.domain + e);
                c.appendChild(s);
                var d = "f0 9f 94 94", u = decodeURIComponent(d.replace(/\s+/g, "").replace(/[0-9a-f]{2}/g, "%$&"));
                u += "  ";
                var l = document.createElement("div");
                l.id = "gravitec-prompt-bell-text";
                var m = document.createTextNode(u + i);
                l.appendChild(m);
                var g = document.createElement("div");
                g.id = "gravitec-prompt-buttons", "ru" != Gravitec.getBrowserlanguage() && "uk" != Gravitec.getBrowserlanguage() || (g.className = "gravitec-prompt-buttons-ru", o.className = "gravitec-prompt-closer-ru");
                var f = document.createElement("div");
                f.id = "gravitec-prompt-allow-button", f.className = "gravitec-prompt-button";
                var J = document.createTextNode(t);
                f.appendChild(J);
                var h = document.createElement("div");
                h.id = "gravitec-prompt-block-button", h.className = "gravitec-prompt-button";
                var v = document.createTextNode(a);
                h.appendChild(v), g.appendChild(f), g.appendChild(h), n.appendChild(o), n.appendChild(c), n.appendChild(l), n.appendChild(g), document.body.appendChild(n), document.getElementById("gravitec-prompt-closer-char").addEventListener("click", function (e) {
                    e.preventDefault(), Gravitec._removeWidget(["gravitec-prompt-widget"])
                }), document.getElementById("gravitec-prompt-block-button").addEventListener("click", function (e) {
                    e.preventDefault(), Gravitec._setCookie("dontShowPrompt", true, 7), Gravitec._removeWidget(["gravitec-prompt-widget"])
                }), document.getElementById("gravitec-prompt-allow-button").addEventListener("click", function (e) {
                    e.preventDefault(), Gravitec._removeWidget(["gravitec-prompt-widget"]), Gravitec._registerOnWidgetClick()
                })
            }
        },
        _createLine: function () {
            function e() {
                var e = window.pageYOffset || document.documentElement.scrollTop;
                e > 150 ? i() : t()
            }

            function i() {
                "block" != n.style.display && (n.style.display = "block")
            }

            function t() {
                "block" == n.style.display && (n.style.display = "none")
            }

            if (!Gravitec._checkCookie("dontShowLine") && Gravitec.initParams._createLineWidget && Gravitec.initParams._createLineWidget.init) {
                var a = false;
                Gravitec.initParams._createLineWidget && Gravitec.initParams._createLineWidget.showInsteadPrompt && (a = true);
                var n = document.createElement("div");
                n.id = a ? "gravitec-line-widget-instead-prompt" : "gravitec-line-widget", n.style.background = Gravitec.initParams._createLineWidget.background || "#1ab394", n.style.color = Gravitec.initParams._createLineWidget.color || "#fff";
                var o = document.createElement("span");
                if (o.id = a ? "gravitec-line-text-instead-prompt" : "gravitec-line-text", Gravitec.initParams._createLineWidget.showbell) {
                    var r = "f0 9f 94 94", p = decodeURIComponent(r.replace(/\s+/g, "").replace(/[0-9a-f]{2}/g, "%$&"));
                    p += "  ";
                    var s = document.createElement("span");
                    s.id = "gravitec-bell-character";
                    var c = document.createTextNode(p);
                    s.appendChild(c), n.appendChild(s)
                }
                var d = document.createTextNode(Gravitec.initParams._createLineWidget.text || "We need your permissions to enable desktop notifications");
                o.appendChild(d);
                var u = document.createElement("a");
                u.id = a ? "gravitec-line-closer-instead-prompt" : "gravitec-line-closer", u.style.color = Gravitec.initParams._createLineWidget.color || "#fff";
                var d = document.createTextNode("x");
                u.appendChild(d), n.appendChild(o), n.appendChild(u), document.body.appendChild(n);
                var l = a ? "gravitec-line-closer-instead-prompt" : "gravitec-line-closer";
                document.getElementById(l).addEventListener("click", function (e) {
                    e.preventDefault(), Gravitec.lineDeleted = true, Gravitec._setCookie("dontShowLine", true, 7), Gravitec._removeWidget([n.id])
                }), Gravitec.lineDeleted || (n.onclick = Gravitec._registerOnWidgetClick), onloadPosition = window.pageYOffset || document.documentElement.scrollTop, "top" != Gravitec.initParams._createLineWidget.position && Gravitec.initParams._createLineWidget.position ? (n.style.bottom = 0, i()) : (n.style.top = 0, onloadPosition > 150 && i(), window.addEventListener("scroll", e, false))
            }
        },
        _registerOnWidgetClick: function () {
            if (Gravitec.lineDeleted === "undefined" || !Gravitec.lineDeleted) {
                if ("safari" == Gravitec.gravitecMode) {
                    Gravitec._removeWidget(["gravitec-line-widget", "gravitec-push-container", "gravitec-prompt-widget", "gravitec-line-widget-instead-prompt"]);
                    var permission = window.safari.pushNotification.permission(Gravitec.safariID);
                    Gravitec._checkRemotePermission(permission, function (permiss) {
                        if (permiss && Gravitec.safariFirstPrompt) {
                            Gravitec._createOnResultEvent(permiss);
                            Gravitec.safariFirstPrompt = null;
                        }
                    });
                }
            } else {
                if (Gravitec.isHttp) {
                    Gravitec._registerHttp();
                } else {
                    Gravitec.registerUserForPush(function (e) {
                        e && Gravitec._removeWidget(["gravitec-line-widget", "gravitec-push-container", "gravitec-prompt-widget", "gravitec-line-widget-instead-prompt"])
                    });
                }
            }
        },
        _createMessageListener: function () {
            function callback(event) {
                if (event.data.httpRegisterd) {
                    Gravitec._putValueToDb("Ids", {
                        type: "SubscriptionId",
                        value: event.data.subscriptionId
                    });
                    Gravitec._putValueToDb("HttpCreated", {
                        type: "subscribedTime",
                        value: Gravitec.getCurrentTimestamp()
                    });
                    if (Gravitec.isGravitecSubdomain) {
                        Gravitec._setCookie("gravitecPromptShowed", true, 60);
                    }
                    Gravitec._createOnResultEvent(event.data.subscriptionId);
                    Gravitec._removeWidget(["gravitec-line-widget", "gravitec-push-container", "gravitec-prompt-widget", "gravitec-line-widget-instead-prompt"]);
                }
            }

            if (!Gravitec.messageListener) {
                window.addEventListener("message", callback, false);
            }
            Gravitec.messageListener = true;
        },
        /**
         * removes widgets by element id;
         * @param ids {Array<String>}
         */
        _removeWidget: function (ids) {
            var i;
            var id, a;
            for (i in ids) {
                if (ids.hasOwnProperty(i)) {
                    id = ids[i];
                    a = document.getElementById(id);
                    if (a !== null) {
                        a.parentNode.removeChild(a);
                    }
                }
            }
        },
        subscribe: function (callback) {
            navigator.serviceWorker.ready.then(function (serviceWorkerRegistration) {
                serviceWorkerRegistration
                    .pushManager
                    ._subscribe({userVisibleOnly: true})
                    .then(function (subscription) {
                        var subscriptionId = subscription.endpoint;
                        if ("subscriptionId" in subscription) {
                            return subscriptionId;
                        }
                        else if (subscriptionId != null) {
                            subscriptionId = Gravitec.endpointWorkaround(subscriptionId);
                            callback(subscriptionId);
                        }
                    })["catch"](function (err) {
                    if (Notification.permission === "denied") {
                        Gravitec._log("Permission for Notifications was denied");
                        Gravitec._removeWidget(["gravitec-line-widget", "gravitec-push-container", "gravitec-prompt-widget", "gravitec-line-widget-instead-prompt"]);
                    }
                    else {
                        Gravitec._log("Unable to subscribe to push.", err)
                    }
                });
            });
            return true;
        },
        _showWelcomeNotification: function (title, body, icon, redirect_url, device_id) {
            if ("chrome" == Gravitec.gravitecMode) {
                var o = {
                    body: body,
                    icon: icon,
                    data: {redirect_url: redirect_url, device_id: device_id}
                }, r = new Notification(title, o);
                r.onclick = function (event) {
                    var data = event.target && event.target.data;
                    if (data && data.redirect_url && data.device_id) {
                        var _sendObject = {
                            type: "welcome_opened",
                            device_id: data.device_id,
                            time: Math.floor(Date.now() / 1000)
                        };
                        var url = Gravitec._getGetUrlWithObject(Gravitec.hostUrl, _sendObject, true);
                        Gravitec._send(url, "get", false, Gravitec._noop);
                        window.location = data.redirect_url;
                    } else Gravitec.getSubscription(function (subscription) {
                        if (subscription) {
                            var _sendObject = {
                                type: "welcome_opened",
                                device_id: Gravitec.md5(subscription),
                                time: Math.floor(Date.now() / 1000)
                            };
                            var url = Gravitec._getGetUrlWithObject(Gravitec.hostUrl, _sendObject, true);
                            Gravitec._send(url, "get", false, Gravitec._noop);
                        }
                    });
                    window.location = Gravitec.webSiteDomain;
                }
            }
        },
        _registerNewUser: function (subscription, callback) {
            var _sendObject = {
                type: "register",
                os: "chrome" == Gravitec.gravitecMode ? 6 : 7,
                device_id: "chrome" == Gravitec.gravitecMode ? Gravitec.md5(subscription) : Gravitec.md5(subscription + Gravitec.appKey),
                os_v: Gravitec.detectBrowser().version,
                lib_v: Gravitec.sdkVersion,
                screen_w: Gravitec._getScreenWidth(),
                screen_h: Gravitec._getScreenHeight(),
                tz: Gravitec.getTimezone(),
                lang: Gravitec.getBrowserlanguage(),
                token: subscription,
                time: Gravitec.getCurrentTimestamp()
            };
            var url = Gravitec._getGetUrlWithObject(Gravitec.hostUrl, _sendObject, true);
            Gravitec._send(url, "get", false, function (response) {
                if (response && response.gravitecwelcome) {
                    var welcomeObj = response.gravitecwelcome;
                    Gravitec._showWelcomeNotification(welcomeObj.title, welcomeObj.body, welcomeObj.icon, welcomeObj.redirect_url, welcomeObj.device_id)
                }
                return callback(response)
            });
        },

        addTag: function (tagName) {
            Gravitec._getDbValue("Ids", "SubscriptionId", function (subscription) {
                if (subscription.target.result) {
                    var _sendObject = {
                        type: "add_tag",
                        device_id: "chrome" == Gravitec.gravitecMode ? Gravitec.md5(subscription.target.result.value) : Gravitec.md5(subscription.target.result.value + Gravitec.appKey),
                        value: tagName,
                        time: Gravitec.getCurrentTimestamp()
                    };
                    var url = Gravitec._getGetUrlWithObject(Gravitec.hostUrl, _sendObject, true);
                    Gravitec._send(url, "get", false, Gravitec._noop)
                }
            })
        },
        /**
         * sets tag names
         * @param tagNames <Array<String>>
         */
        setTags: function (tagNames) {
            Gravitec._getDbValue("Ids", "SubscriptionId", function (subscription) {
                if (subscription.target.result) {
                    var _sendObject = {
                        type: "set_tags",
                        device_id: "chrome" == Gravitec.gravitecMode ? Gravitec.md5(subscription.target.result.value) : Gravitec.md5(subscription.target.result.value + Gravitec.appKey),
                        value: tagNames,
                        time: Gravitec.getCurrentTimestamp()
                    };
                    var url = Gravitec._getGetUrlWithObject(Gravitec.hostUrl, _sendObject, true);
                    Gravitec._send(url, "get", false, Gravitec._noop)
                }
            })
        },
        removeTag: function (tagName) {
            Gravitec._getDbValue("Ids", "SubscriptionId", function (subscription) {
                if (subscription.target.result) {
                    var _sendObject = {
                        type: "remove_tag",
                        device_id: "chrome" == Gravitec.gravitecMode ? Gravitec.md5(subscription.target.result.value) : Gravitec.md5(subscription.target.result.value + Gravitec.appKey),
                        value: tagName,
                        time: Gravitec.getCurrentTimestamp()
                    };
                    var url = Gravitec._getGetUrlWithObject(Gravitec.hostUrl, _sendObject, true);
                    Gravitec._send(url, "get", false, Gravitec._noop)
                }
            })
        },
        removeAllTags: function () {
            Gravitec._getDbValue("Ids", "SubscriptionId", function (subscription) {
                if (subscription.target.result) {
                    var _sendObject = {
                        type: "remove_all_tags",
                        device_id: "chrome" == Gravitec.gravitecMode ? Gravitec.md5(subscription.target.result.value) : Gravitec.md5(subscription.target.result.value + Gravitec.appKey),
                        time: Gravitec.getCurrentTimestamp()
                    };
                    var url = Gravitec._getGetUrlWithObject(Gravitec.hostUrl, _sendObject, true);
                    Gravitec._send(url, "get", false, Gravitec._noop);
                }
            })
        },
        setAlias: function (value) {
            Gravitec._getDbValue("Ids", "SubscriptionId", function (subscription) {
                if (subscription.target.result) {
                    var _sendObject = {
                        type: "alias",
                        device_id: "chrome" == Gravitec.gravitecMode ? Gravitec.md5(subscription.target.result.value) : Gravitec.md5(subscription.target.result.value + Gravitec.appKey),
                        value: value,
                        time: Gravitec.getCurrentTimestamp()
                    };
                    var url = Gravitec._getGetUrlWithObject(Gravitec.hostUrl, _sendObject, true);
                    Gravitec._send(url, "get", false, Gravitec._noop);
                }
            })
        },
        _setCookie: function (key, value, days) {
            var date = new Date();
            date.setTime(date.getTime() + days * 86400000); // 86400000 = 24 * 60 * 60 * 1000

            var cookieDateString = "; expires=" + date.toUTCString();

            document.cookie = encodeURIComponent(key) + "=" + encodeURIComponent(value) + cookieDateString + "; path=/";
        },
        /**
         * returns cookie value
         * @param key {String}
         * @returns {String}
         */
        _checkCookie: function (key) {
            var start = key + "=";
            var cookieValues = document.cookie.split(";");
            var i;
            for (i = 0; i < cookieValues.length; i++) {
                for (var n = cookieValues[i]; " " == n.charAt(0);) {
                    n = n.substring(1);
                }
                if (n.indexOf(start) == 0) {
                    return n.substring(start.length, n.length);
                }
            }
            return "";
        },
        /**
         * return supported browser name or false
         * @returns {"chrome"|"safari"|boolean}
         */
        _checkBrowser: function () {
            var browserName = Gravitec.detectBrowser().name.toLowerCase();
            if ("opera" == browserName || "ie" == browserName || "firefox" == browserName) {
                return false;
            }
            if (document.baseURI.indexOf(Gravitec.webSiteDomain) !== -1 && !Gravitec.isGravitecSubdomain) {
                Gravitec._log("You must use this SDK only for " + Gravitec.webSiteDomain);
                return false;
            }
            if (Gravitec.checkIfSafariNotification()) {
                Gravitec.gravitecMode = "safari";
            }
            else {
                if (!Gravitec.isPushManagerSupported()) {
                    Gravitec._log("Push messaging isn't supported.");
                    return false;
                }
                if (!Gravitec.isNotificationsSupported()) {
                    Gravitec._log("Notifications aren't supported.");
                    return false;
                }
                if (!Gravitec.isNotificationPermitted()) {
                    Gravitec._log("The user has blocked notifications.");
                    return false;
                }
                Gravitec.gravitecMode = "chrome";
            }
            return true;
        },
        _getScreenWidth: function () {
            return window.screen ? screen.width : 0;
        },
        _getScreenHeight: function () {
            return window.screen ? screen.height : 0;
        },
        isNotificationsSupported: function () {
            return "showNotification" in (ServiceWorkerRegistration && ServiceWorkerRegistration.prototype);
        },
        isNotificationPermitted: function () {
            return "denied" != Notification.permission;
        },
        isPushManagerSupported: function () {
            return "PushManager" in window;
        },
        getCurrentTimestamp: function () {
            return Math.floor(Date.now() / 1000);
        },
        getBrowserlanguage: function () {
            return navigator.language.substring(0, 2);
        },
        checkIfSafariNotification: function () {
            return "safari" in window && "pushNotification" in window.safari;
        },
        getTimezone: function () {
            return -60 * (new Date).getTimezoneOffset();
        },
        getIsPushManagerSupported: function (callback) {
            return callback(Gravitec.isPushManagerSupported());
        },
        isMobileScreen: function () {
            var e = false;
            return function (i) {
                (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(i) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(i.substr(0, 4))) && (e = true)
            }(navigator.userAgent || navigator.vendor || window.opera), e
        },
        detectBrowser: function () {
            var e, i = navigator.userAgent, t = i.match(/(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i) || [];
            return /trident/i.test(t[1]) ? (e = /\brv[ :]+(\d+)/g.exec(i) || [], {
                name: "IE",
                version: e[1] || ""
            }) : "Chrome" === t[1] && (e = i.match(/\bOPR\/(\d+)/), null != e) ? {
                name: "Opera",
                version: e[1]
            } : (t = t[2] ? [t[1], t[2]] : [navigator.appName, navigator.appVersion, "-?"], null != (e = i.match(/version\/(\d+)/i)) && t.splice(1, 1, e[1]), {
                name: t[0],
                version: t[1]
            })
        },
        endpointWorkaround: function (e) {
            if (~e.indexOf("https://android.googleapis.com/gcm/_send")) {
                var i = e.split("https://android.googleapis.com/gcm/_send/");
                return i[1]
            }
            return e
        },
        _prepareId: function (subscription, additions) {
            additions = additions || {};
            if (!subscription) {
                return additions;
            }
            var i, browser;
            var found = false;
            var subscriptionId = subscription
                && (
                    (('subscriptionId' in subscription) && subscription.subscriptionId) ||
                    (('endpoint' in subscription) && subscription.endpoint)
                )
                || "";
            var browsers = [
                {
                    name: 'CHROME',
                    prefix: 'https://android.googleapis.com/gcm/send/'
                },
                {
                    name: 'FIREFOX',
                    prefix: 'https://updates.push.services.mozilla.com/push/'
                }
            ];
            for (i = 0; i < browsers.length; i++) {
                browser = browsers[i];
                if (~subscriptionId.indexOf(browsers[i].prefix)) {
                    additions.regID = subscriptionId.split(browsers[i].prefix)[1];
                    additions.browser = browsers[i].name;
                    found = true;
                }
                if (found) {
                    if (additions.browser === 'CHROME') {
                        var keys = (subscription.toJSON && subscription.toJSON().keys) || {};
                        additions.auth = keys.auth;
                        additions.p256dh = keys.p256dh;
                    }
                    break;
                }
            }
            additions.regID = additions.regID || subscriptionId;
            additions.browser = additions.browser || (Gravitec.gravitecMode === 'safari');
            return additions;
        },

        md5: function (e) {
            var i, t, a, n, o, r, p, s, c, d = function (e) {
                e = e.replace(/\r\n/g, "\n");
                for (var i = "", t = 0; t < e.length; t++) {
                    var a = e.charCodeAt(t);
                    128 > a ? i += String.fromCharCode(a) : a > 127 && 2048 > a ? (i += String.fromCharCode(a >> 6 | 192), i += String.fromCharCode(63 & a | 128)) : (i += String.fromCharCode(a >> 12 | 224), i += String.fromCharCode(a >> 6 & 63 | 128), i += String.fromCharCode(63 & a | 128))
                }
                return i
            }, u = function (e, i) {
                return e << i | e >>> 32 - i
            }, l = function (e, i) {
                var t, a, n, o, r;
                return n = 2147483648 & e, o = 2147483648 & i, t = 1073741824 & e, a = 1073741824 & i, r = (1073741823 & e) + (1073741823 & i), t & a ? 2147483648 ^ r ^ n ^ o : t | a ? 1073741824 & r ? 3221225472 ^ r ^ n ^ o : 1073741824 ^ r ^ n ^ o : r ^ n ^ o
            }, m = function (e, i, t) {
                return e & i | ~e & t
            }, g = function (e, i, t) {
                return e & t | i & ~t
            }, f = function (e, i, t) {
                return e ^ i ^ t
            }, J = function (e, i, t) {
                return i ^ (e | ~t)
            }, h = function (e, i, t, a, n, o, r) {
                return e = l(e, l(l(m(i, t, a), n), r)), l(u(e, o), i)
            }, v = function (e, i, t, a, n, o, r) {
                return e = l(e, l(l(g(i, t, a), n), r)), l(u(e, o), i)
            }, b = function (e, i, t, a, n, o, r) {
                return e = l(e, l(l(f(i, t, a), n), r)), l(u(e, o), i)
            }, w = function (e, i, t, a, n, o, r) {
                return e = l(e, l(l(J(i, t, a), n), r)), l(u(e, o), i)
            }, j = function (e) {
                for (var i, t = e.length, a = t + 8, n = (a - a % 64) / 64, o = 16 * (n + 1), r = Array(o - 1), p = 0, s = 0; t > s;)i = (s - s % 4) / 4, p = s % 4 * 8, r[i] = r[i] | e.charCodeAt(s) << p, s++;
                return i = (s - s % 4) / 4, p = s % 4 * 8, r[i] = r[i] | 128 << p, r[o - 2] = t << 3, r[o - 1] = t >>> 29, r
            }, k = function (e) {
                var i, t, a = "", n = "";
                for (t = 0; 3 >= t; t++)i = e >>> 8 * t & 255, n = "0" + i.toString(16), a += n.substr(n.length - 2, 2);
                return a
            }, y = Array(), S = 7, P = 12, C = 17, I = 22, E = 5, W = 9, _ = 14, N = 20, D = 4, T = 11, L = 16, M = 23, U = 6, B = 10, O = 15, x = 21;
            for (e = d(e), y = j(e), r = 1732584193, p = 4023233417, s = 2562383102, c = 271733878, i = 0; i < y.length; i += 16)t = r, a = p, n = s, o = c, r = h(r, p, s, c, y[i + 0], S, 3614090360), c = h(c, r, p, s, y[i + 1], P, 3905402710), s = h(s, c, r, p, y[i + 2], C, 606105819), p = h(p, s, c, r, y[i + 3], I, 3250441966), r = h(r, p, s, c, y[i + 4], S, 4118548399), c = h(c, r, p, s, y[i + 5], P, 1200080426), s = h(s, c, r, p, y[i + 6], C, 2821735955), p = h(p, s, c, r, y[i + 7], I, 4249261313), r = h(r, p, s, c, y[i + 8], S, 1770035416), c = h(c, r, p, s, y[i + 9], P, 2336552879), s = h(s, c, r, p, y[i + 10], C, 4294925233), p = h(p, s, c, r, y[i + 11], I, 2304563134), r = h(r, p, s, c, y[i + 12], S, 1804603682), c = h(c, r, p, s, y[i + 13], P, 4254626195), s = h(s, c, r, p, y[i + 14], C, 2792965006), p = h(p, s, c, r, y[i + 15], I, 1236535329), r = v(r, p, s, c, y[i + 1], E, 4129170786), c = v(c, r, p, s, y[i + 6], W, 3225465664), s = v(s, c, r, p, y[i + 11], _, 643717713), p = v(p, s, c, r, y[i + 0], N, 3921069994), r = v(r, p, s, c, y[i + 5], E, 3593408605), c = v(c, r, p, s, y[i + 10], W, 38016083), s = v(s, c, r, p, y[i + 15], _, 3634488961), p = v(p, s, c, r, y[i + 4], N, 3889429448), r = v(r, p, s, c, y[i + 9], E, 568446438), c = v(c, r, p, s, y[i + 14], W, 3275163606), s = v(s, c, r, p, y[i + 3], _, 4107603335), p = v(p, s, c, r, y[i + 8], N, 1163531501), r = v(r, p, s, c, y[i + 13], E, 2850285829), c = v(c, r, p, s, y[i + 2], W, 4243563512), s = v(s, c, r, p, y[i + 7], _, 1735328473), p = v(p, s, c, r, y[i + 12], N, 2368359562), r = b(r, p, s, c, y[i + 5], D, 4294588738), c = b(c, r, p, s, y[i + 8], T, 2272392833), s = b(s, c, r, p, y[i + 11], L, 1839030562), p = b(p, s, c, r, y[i + 14], M, 4259657740), r = b(r, p, s, c, y[i + 1], D, 2763975236), c = b(c, r, p, s, y[i + 4], T, 1272893353), s = b(s, c, r, p, y[i + 7], L, 4139469664), p = b(p, s, c, r, y[i + 10], M, 3200236656), r = b(r, p, s, c, y[i + 13], D, 681279174), c = b(c, r, p, s, y[i + 0], T, 3936430074), s = b(s, c, r, p, y[i + 3], L, 3572445317), p = b(p, s, c, r, y[i + 6], M, 76029189), r = b(r, p, s, c, y[i + 9], D, 3654602809), c = b(c, r, p, s, y[i + 12], T, 3873151461), s = b(s, c, r, p, y[i + 15], L, 530742520), p = b(p, s, c, r, y[i + 2], M, 3299628645), r = w(r, p, s, c, y[i + 0], U, 4096336452), c = w(c, r, p, s, y[i + 7], B, 1126891415), s = w(s, c, r, p, y[i + 14], O, 2878612391), p = w(p, s, c, r, y[i + 5], x, 4237533241), r = w(r, p, s, c, y[i + 12], U, 1700485571), c = w(c, r, p, s, y[i + 3], B, 2399980690), s = w(s, c, r, p, y[i + 10], O, 4293915773), p = w(p, s, c, r, y[i + 1], x, 2240044497), r = w(r, p, s, c, y[i + 8], U, 1873313359), c = w(c, r, p, s, y[i + 15], B, 4264355552), s = w(s, c, r, p, y[i + 6], O, 2734768916), p = w(p, s, c, r, y[i + 13], x, 1309151649), r = w(r, p, s, c, y[i + 4], U, 4149444226), c = w(c, r, p, s, y[i + 11], B, 3174756917), s = w(s, c, r, p, y[i + 2], O, 718787259), p = w(p, s, c, r, y[i + 9], x, 3951481745), r = l(r, t), p = l(p, a), s = l(s, n), c = l(c, o);
            var R = k(r) + k(p) + k(s) + k(c);
            return R.toLowerCase()
        }
    };

Gravitec.push(['init', {autoRegister: true}]);