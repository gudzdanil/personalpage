function in_array(e, i, t) {
    var a, n = !1, t = !!t;
    for (a in i)if (t && i[a] === e || !t && i[a] == e) {
        n = !0;
        break
    }
    return n
}
window.Jeapie || (window.Jeapie = []);
var tempJeapie = null;
"undefined" != typeof Jeapie && (tempJeapie = Jeapie);
var Jeapie = {
    sdkVersion: "0.2.9",
    hostUrl: "https://go.jeapie.com/api/v2/web/browser",
    logging: !0,
    initParams: null,
    jeapiePushDb: null,
    messageListener: null,
    appKey: "5b59a854bfc4a43b998961f5d3fc401f",
    subdomainName: "ubr",
    jeapieMode: null,
    isHttp: true,
    webSiteDomain: "http://ubr.ua",
    autoRegister: !0,
    deviceToken: null,
    safariFirstPrompt: null,
    isGravitecSubdomain: true,
    log: function (e) {
        1 == Jeapie.logging && console.log(e)
    },
    processPushes: function (e) {
        for (var i = 0; i < e.length; i++)Jeapie.push(e[i])
    },
    push: function (e) {
        if ("function" == typeof e)e(); else {
            var i = e.shift();
            Jeapie[i].apply(null, e)
        }
    },
    init: function (e) {
        Jeapie.checkBrowser() && ("undefined" != typeof e && (Jeapie.initParams = e, Jeapie.initParams.createLineWidget && Jeapie.initParams.createLineWidget.init && Jeapie.subscribeWithWidget(!1, !0), Jeapie.initParams.createButton && Jeapie.subscribeWithWidget(!0), 0 == Jeapie.initParams.autoRegister && (Jeapie.autoRegister = !1)), window.addEventListener("load", function () {
            if ("chrome" == Jeapie.jeapieMode) {
                if (Jeapie.isHttp)return void(Jeapie.autoRegister && Jeapie.subscribeWithWidget(!1, !1, !0));
                manifest = document.createElement("link"), manifest.rel = "manifest", manifest.href = Jeapie.webSiteDomain + "/manifest.json", document.head.appendChild(manifest), Jeapie.initWorker()
            }
            Jeapie.autoRegister && Jeapie.getSubscription(function (e) {
                e ? Jeapie.isSubscriptionChanged(e) : "chrome" == Jeapie.jeapieMode && Jeapie.subscribe(function (e) {
                    Jeapie.putValueToDb("Ids", {
                        type: "SubscriptionId",
                        value: e
                    }), Jeapie.putValueToDb("Ids", {
                        type: "deviceId",
                        value: Jeapie.md5(e)
                    }), Jeapie.registerNewUser(e, function () {
                        Jeapie.createOnResultEvent(e)
                    })
                })
            })
        }))
    },
    createOnResultEvent: function (e) {
        Jeapie.deviceToken = e;
        var i = new Event("jeapieresult");
        document.dispatchEvent(i)
    },
    afterSubscription: function (e) {
        document.addEventListener("jeapieresult", function (i) {
            return e(Jeapie.deviceToken)
        }, !1)
    },
    registerUserForPush: function (e) {
        "safari" == Jeapie.jeapieMode ? Jeapie.checkRemotePermission(window.safari.pushNotification.permission("web.web.jeapie.236125cccf364d4bbc73683ae999eb40"), function (e) {
            e && Jeapie.safariFirstPrompt && (Jeapie.createOnResultEvent(e), Jeapie.safariFirstPrompt = null)
        }) : Jeapie.subdomainName ? Jeapie.registerHttp() : Jeapie.getSubscription(function (i) {
            i ? Jeapie.isSubscriptionChanged(i) : Jeapie.subscribe(function (i) {
                Jeapie.putValueToDb("Ids", {type: "SubscriptionId", value: i}), Jeapie.registerNewUser(i, function (t) {
                    return t ? (Jeapie.createOnResultEvent(i), e(t)) : void 0
                })
            })
        })
    },
    initDb: function (e) {
        if (Jeapie.jeapiePushDb)return void e();
        var i = indexedDB.open("jeapie_push_sdk_db", 1);
        i.onsuccess = function (i) {
            Jeapie.jeapiePushDb = i.target.result, e()
        }, i.onupgradeneeded = function (e) {
            var i = e.target.result;
            i.createObjectStore("Ids", {keyPath: "type"}), i.createObjectStore("HttpCreated", {keyPath: "type"})
        }
    },
    getDbValue: function (e, i, t) {
        Jeapie.initDb(function () {
            Jeapie.jeapiePushDb.transaction(e).objectStore(e).get(i).onsuccess = t
        })
    },
    getAllValues: function (e, i) {
        Jeapie.initDb(function () {
            var t = {};
            Jeapie.jeapiePushDb.transaction(e).objectStore(e).openCursor().onsuccess = function (e) {
                var a = e.target.result;
                a ? (t[a.key] = a.value.value, a["continue"]()) : i(t)
            }
        })
    },
    putValueToDb: function (e, i) {
        Jeapie.initDb(function () {
            Jeapie.jeapiePushDb.transaction([e], "readwrite").objectStore(e).put(i)
        })
    },
    deleteDbValue: function (e, i) {
        Jeapie.initDb(function () {
            Jeapie.jeapiePushDb.transaction([e], "readwrite").objectStore(e)["delete"](i)
        })
    },
    initWorker: function () {
        return "serviceWorker" in navigator && navigator.serviceWorker.register("/push-worker.js").then(function (e) {
            Jeapie.log("Worker registered")
        })["catch"](function (e) {
            return Jeapie.log(e), !1
        }), !0
    },
    send: function (e, i, t, a) {
        if ("chrome" == Jeapie.jeapieMode) {
            var n = {method: i};
            t && (n.body = JSON.stringify(t)), fetch(e, n).then(function (e) {
                return 200 !== e.status ? void Jeapie.log("Looks like there was a problem. Status Code: " + e.status) : void e.json().then(function (e) {
                    return Jeapie.log("data successfully sent"), "function" == typeof a ? a(e) : void 0
                })
            })["catch"](function (e) {
                Jeapie.log("Fetch Error :-S", e)
            })
        } else {
            var o = new XMLHttpRequest;
            o.open(i, e, !0), o.onreadystatechange = function () {
                if (4 == o.readyState) {
                    if (200 !== o.status)return void Jeapie.log("Looks like there was a problem. Status Code: " + o.status);
                    if (Jeapie.log("data successfully sent"), "function" == typeof a)return a(o.responseText)
                }
            }, o.send(null)
        }
    },
    getGetUrlWithObject: function (e, i) {
        return e + "?app_key=" + Jeapie.appKey + "&data=" + JSON.stringify(i)
    },
    checkRemotePermission: function (e, i) {
        if ("default" === e.permission)Jeapie.safariFirstPrompt = !0, window.safari.pushNotification.requestPermission("https://go.jeapie.com/safari/5b59a854bfc4a43b998961f5d3fc401f", "web.web.jeapie.236125cccf364d4bbc73683ae999eb40", {}, function (e) {
            Jeapie.checkRemotePermission(e, i)
        }); else {
            if ("denied" === e.permission)return i();
            if ("granted" === e.permission)return Jeapie.isSubscriptionChanged(e.deviceToken), i(e.deviceToken)
        }
    },
    registerHttp: function () {
        if ("safari" == Jeapie.jeapieMode)Jeapie.checkRemotePermission(window.safari.pushNotification.permission("web.web.jeapie.236125cccf364d4bbc73683ae999eb40"), function (e) {
            e && Jeapie.safariFirstPrompt && (Jeapie.createOnResultEvent(e), Jeapie.safariFirstPrompt = null)
        }); else {
            if (!Jeapie.isHttp || null === Jeapie.subdomainName || !Jeapie.isPushManagerSupported())return;
            var e = void 0 != window.screenLeft ? window.screenLeft : screen.left, i = void 0 != window.screenTop ? window.screenTop : screen.top, t = window.innerWidth ? window.innerWidth : document.documentElement.clientWidth ? document.documentElement.clientWidth : screen.width, a = window.innerHeight ? window.innerHeight : document.documentElement.clientHeight ? document.documentElement.clientHeight : screen.height, n = 600, o = 350, r = t / 2 - n / 2 + e, p = a / 2 - o / 2 + i, s = window.open("https://" + Jeapie.subdomainName + ".gravitec.net/subscribe?utm_source=" + Jeapie.subdomainName, "_blank", "scrollbars=yes, width=" + n + ", height=" + o + ", top=" + p + ", left=" + r);
            s && s.focus(), Jeapie.createMessageListener()
        }
    },
    isSubscribed: function (e) {
        if ("chrome" != Jeapie.jeapieMode) {
            var i = window.safari.pushNotification.permission("web.web.jeapie.236125cccf364d4bbc73683ae999eb40").permission;
            return e("granted" == i)
        }
        Jeapie.getSubscription(function (i) {
            return e(!!i)
        })
    },
    getSubscription: function (e) {
        if ("chrome" == Jeapie.jeapieMode)Jeapie.isHttp ? Jeapie.getDbValue("Ids", "SubscriptionId", function (i) {
            return i.target.result ? e(i.target.result.value) : e()
        }) : navigator.serviceWorker.ready.then(function (i) {
            i.pushManager.getSubscription().then(function (i) {
                return i ? ("subscriptionId" in i ? subscriptionId = i.subscriptionId : subscriptionId = i.endpoint, subscriptionId = Jeapie.endpointWorkaround(subscriptionId), e(subscriptionId)) : e()
            })["catch"](function (e) {
                Jeapie.log("Error during getSubscription()", e)
            })
        }); else {
            var i = window.safari.pushNotification.permission("web.web.jeapie.236125cccf364d4bbc73683ae999eb40");
            Jeapie.checkRemotePermission(i, function (e) {
                e && Jeapie.safariFirstPrompt && (Jeapie.createOnResultEvent(e), Jeapie.safariFirstPrompt = null)
            })
        }
    },
    isSubscriptionChanged: function (e) {
        Jeapie.getDbValue("Ids", "SubscriptionId", function (i) {
            if (i.target.result) {
                if (i.target.result.value != e) {
                    var t = {
                        type: "token",
                        device_id: "chrome" == Jeapie.jeapieMode ? Jeapie.md5(i.target.result.value) : Jeapie.md5(i.target.result.value + Jeapie.appKey),
                        value: e,
                        time: Jeapie.getCurrentTimestamp()
                    };
                    return url = Jeapie.getGetUrlWithObject(Jeapie.hostUrl, t, !0), void Jeapie.send(url, "get", !1, function (i) {
                        i && Jeapie.createOnResultEvent(e)
                    })
                }
            } else i.target.result || "safari" != Jeapie.jeapieMode || (Jeapie.putValueToDb("Ids", {
                type: "SubscriptionId",
                value: e
            }), Jeapie.registerNewUser(e, function (i) {
                i && Jeapie.createOnResultEvent(e)
            }))
        })
    },
    subscribeWithWidget: function (e, i, t) {
        "chrome" != Jeapie.jeapieMode && "safari" != Jeapie.jeapieMode || (Jeapie.isHttp ? "chrome" == Jeapie.jeapieMode ? Jeapie.getDbValue("Ids", "SubscriptionId", function (a) {
            a.target.result ? Jeapie.isGravitecSubdomain && !Jeapie.checkCookie("gravitecPromptShowed") ? Jeapie.appendWidgets(e, i, t) : Jeapie.getDbValue("HttpCreated", "subscribedTime", function (a) {
                if (a.target.result) {
                    var n = Jeapie.getCurrentTimestamp(), o = a.target.result.value, r = n - o;
                    r > 5184e3 && Jeapie.appendWidgets(e, i, t)
                }
            }) : Jeapie.appendWidgets(e, i, t)
        }) : "default" == window.safari.pushNotification.permission("web.web.jeapie.236125cccf364d4bbc73683ae999eb40").permission && Jeapie.appendWidgets(e, i, t) : "chrome" == Jeapie.jeapieMode ? Jeapie.getSubscription(function (a) {
            a || Jeapie.appendWidgets(e, i, t)
        }) : "default" == window.safari.pushNotification.permission("web.web.jeapie.236125cccf364d4bbc73683ae999eb40").permission && Jeapie.appendWidgets(e, i, t))
    },
    appendWidgets: function (e, i, t) {
        if (t && Jeapie.createNativePrompt(), e && Jeapie.createButton(), i && Jeapie.createLine(), null === document.getElementById("jeapie-button-style")) {
            var a = document.getElementsByTagName("head")[0], n = document.createElement("link");
            n.id = "jeapie-button-style", n.rel = "stylesheet", n.type = "text/css", n.href = "https://cdn.jeapie.com/jeapiecss/pushbutton.css", n.media = "all", a.appendChild(n)
        }
    },
    createButton: function () {
        function e() {
            setInterval(function () {
                var e = document.getElementById("jeapie-push-container");
                e.className = e.className + " jeapie-shake-animated jeapie-shake", setTimeout(function () {
                    e.className = ""
                }, 1e3)
            }, 9e4)
        }

        function i() {
            document.getElementById("jeapie-push-tooltip").style.display = "block", document.getElementById("jeapie-push-dont-show").style.display = "block"
        }

        function t() {
            document.getElementById("jeapie-push-tooltip").style.display = "block"
        }

        function a() {
            document.getElementById("jeapie-push-tooltip").style.display = "none", setTimeout(function () {
                document.getElementById("jeapie-push-dont-show").style.display = "none"
            }, 6e3)
        }

        function n() {
            Jeapie.setCookie("dontShowButton", !0, 7), Jeapie.removeWidget(["jeapie-push-container"])
        }

        if (!Jeapie.checkCookie("dontShowButton")) {
            Jeapie.initParams.tooltipText || (Jeapie.initParams.tooltipText = "Подпишитесь на наши обновления в один клик!");
            var o = document.createElement("button");
            o.id = "jeapie-push-button";
            var r = document.createElement("span");
            r.id = "jeapie-push-tooltip";
            var p = document.createTextNode(Jeapie.initParams.tooltipText);
            r.appendChild(p);
            var s = document.createElement("span");
            s.id = "jeapie-push-dont-show";
            var c = document.createTextNode("x");
            s.appendChild(c);
            var d = document.createElement("div");
            d.id = "jeapie-push-container", d.appendChild(o), d.appendChild(r), d.appendChild(s), Jeapie.checkCookie("firstSeen") ? (document.body.appendChild(d), e(), document.getElementById("jeapie-push-button").onmouseover = i, document.getElementById("jeapie-push-button").onmouseout = a, document.getElementById("jeapie-push-button").onclick = Jeapie.registerOnWidgetClick, document.getElementById("jeapie-push-dont-show").onclick = n) : setTimeout(function () {
                document.body.appendChild(d), Jeapie.setCookie("firstSeen", !0, 30);
                var o = document.getElementById("jeapie-push-container");
                o.className = o.className + " jeapie-animated jeapie-rollin", setTimeout(function () {
                    t()
                }, 1e3), setTimeout(function () {
                    a(), o.className = ""
                }, 3e3), e(), document.getElementById("jeapie-push-button").onmouseover = i, document.getElementById("jeapie-push-button").onmouseout = a, document.getElementById("jeapie-push-button").onclick = Jeapie.registerOnWidgetClick, document.getElementById("jeapie-push-dont-show").onclick = n
            }, 2e3), Jeapie.createMessageListener()
        }
    },
    createNativePrompt: function () {
        if (!Jeapie.checkCookie("dontShowPrompt")) {
            if (Jeapie.isMobileScreen())return Jeapie.initParams = {
                createLineWidget: {
                    init: !0,
                    background: "#1ab394",
                    color: "#fff",
                    text: "Opt-in for notifications",
                    position: "bottom",
                    showbell: !1,
                    showInsteadPrompt: !0
                }
            }, void Jeapie.createLine();
            var e = " wants to:", i = "  Send notifications", t = "Allow", a = "Block", n = document.createElement("div");
            n.id = "jeapie-prompt-widget", "ru" != Jeapie.getBrowserlanguage() && "uk" != Jeapie.getBrowserlanguage() || (e = " запрашивает разрешение на:", i = "  отправку оповещений", t = "Разрешить", a = "Блокировать", n.className = "jeapie-ru-block");
            var o = document.createElement("div");
            o.id = "jeapie-prompt-closer";
            var r = document.createElement("span");
            r.id = "jeapie-prompt-closer-char";
            var p = String.fromCharCode(10761), s = document.createTextNode(p);
            r.appendChild(s), o.appendChild(r);
            var c = document.createElement("div");
            c.id = "jeapie-prompt-domain-name";
            var s = document.createTextNode(document.domain + e);
            c.appendChild(s);
            var d = "f0 9f 94 94", u = decodeURIComponent(d.replace(/\s+/g, "").replace(/[0-9a-f]{2}/g, "%$&"));
            u += "  ";
            var l = document.createElement("div");
            l.id = "jeapie-prompt-bell-text";
            var m = document.createTextNode(u + i);
            l.appendChild(m);
            var g = document.createElement("div");
            g.id = "jeapie-prompt-buttons", "ru" != Jeapie.getBrowserlanguage() && "uk" != Jeapie.getBrowserlanguage() || (g.className = "jeapie-prompt-buttons-ru", o.className = "jeapie-prompt-closer-ru");
            var f = document.createElement("div");
            f.id = "jeapie-prompt-allow-button", f.className = "jeapie-prompt-button";
            var J = document.createTextNode(t);
            f.appendChild(J);
            var h = document.createElement("div");
            h.id = "jeapie-prompt-block-button", h.className = "jeapie-prompt-button";
            var v = document.createTextNode(a);
            h.appendChild(v), g.appendChild(f), g.appendChild(h), n.appendChild(o), n.appendChild(c), n.appendChild(l), n.appendChild(g), document.body.appendChild(n), document.getElementById("jeapie-prompt-closer-char").addEventListener("click", function (e) {
                e.preventDefault(), Jeapie.removeWidget(["jeapie-prompt-widget"])
            }), document.getElementById("jeapie-prompt-block-button").addEventListener("click", function (e) {
                e.preventDefault(), Jeapie.setCookie("dontShowPrompt", !0, 7), Jeapie.removeWidget(["jeapie-prompt-widget"])
            }), document.getElementById("jeapie-prompt-allow-button").addEventListener("click", function (e) {
                e.preventDefault(), Jeapie.removeWidget(["jeapie-prompt-widget"]), Jeapie.registerOnWidgetClick()
            })
        }
    },
    createLine: function () {
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

        if (!Jeapie.checkCookie("dontShowLine") && Jeapie.initParams.createLineWidget && Jeapie.initParams.createLineWidget.init) {
            var a = !1;
            Jeapie.initParams.createLineWidget && Jeapie.initParams.createLineWidget.showInsteadPrompt && (a = !0);
            var n = document.createElement("div");
            n.id = a ? "jeapie-line-widget-instead-prompt" : "jeapie-line-widget", n.style.background = Jeapie.initParams.createLineWidget.background || "#1ab394", n.style.color = Jeapie.initParams.createLineWidget.color || "#fff";
            var o = document.createElement("span");
            if (o.id = a ? "jeapie-line-text-instead-prompt" : "jeapie-line-text", Jeapie.initParams.createLineWidget.showbell) {
                var r = "f0 9f 94 94", p = decodeURIComponent(r.replace(/\s+/g, "").replace(/[0-9a-f]{2}/g, "%$&"));
                p += "  ";
                var s = document.createElement("span");
                s.id = "jeapie-bell-character";
                var c = document.createTextNode(p);
                s.appendChild(c), n.appendChild(s)
            }
            var d = document.createTextNode(Jeapie.initParams.createLineWidget.text || "We need your permissions to enable desktop notifications");
            o.appendChild(d);
            var u = document.createElement("a");
            u.id = a ? "jeapie-line-closer-instead-prompt" : "jeapie-line-closer", u.style.color = Jeapie.initParams.createLineWidget.color || "#fff";
            var d = document.createTextNode("x");
            u.appendChild(d), n.appendChild(o), n.appendChild(u), document.body.appendChild(n);
            var l = a ? "jeapie-line-closer-instead-prompt" : "jeapie-line-closer";
            document.getElementById(l).addEventListener("click", function (e) {
                e.preventDefault(), Jeapie.lineDeleted = !0, Jeapie.setCookie("dontShowLine", !0, 7), Jeapie.removeWidget([n.id])
            }), Jeapie.lineDeleted || (n.onclick = Jeapie.registerOnWidgetClick), onloadPosition = window.pageYOffset || document.documentElement.scrollTop, "top" != Jeapie.initParams.createLineWidget.position && Jeapie.initParams.createLineWidget.position ? (n.style.bottom = 0, i()) : (n.style.top = 0, onloadPosition > 150 && i(), window.addEventListener("scroll", e, !1))
        }
    },
    registerOnWidgetClick: function () {
        if ("undefined" == Jeapie.lineDeleted || !Jeapie.lineDeleted)if ("safari" == Jeapie.jeapieMode) {
            Jeapie.removeWidget(["jeapie-line-widget", "jeapie-push-container", "jeapie-prompt-widget", "jeapie-line-widget-instead-prompt"]);
            var e = window.safari.pushNotification.permission("web.web.jeapie.236125cccf364d4bbc73683ae999eb40");
            Jeapie.checkRemotePermission(e, function (e) {
                e && Jeapie.safariFirstPrompt && (Jeapie.createOnResultEvent(e), Jeapie.safariFirstPrompt = null)
            })
        } else Jeapie.isHttp ? Jeapie.registerHttp() : Jeapie.registerUserForPush(function (e) {
            e && Jeapie.removeWidget(["jeapie-line-widget", "jeapie-push-container", "jeapie-prompt-widget", "jeapie-line-widget-instead-prompt"])
        })
    },
    createMessageListener: function () {
        function e(e) {
            e.data.httpRegisterd && (Jeapie.putValueToDb("Ids", {
                type: "SubscriptionId",
                value: e.data.subscriptionId
            }), Jeapie.putValueToDb("HttpCreated", {
                type: "subscribedTime",
                value: Jeapie.getCurrentTimestamp()
            }), Jeapie.isGravitecSubdomain && Jeapie.setCookie("gravitecPromptShowed", !0, 60), Jeapie.createOnResultEvent(e.data.subscriptionId), Jeapie.removeWidget(["jeapie-line-widget", "jeapie-push-container", "jeapie-prompt-widget", "jeapie-line-widget-instead-prompt"]))
        }

        Jeapie.messageListener || (window.addEventListener("message", e, !1), Jeapie.messageListener = !0)
    },
    removeWidget: function (e) {
        for (var i in e) {
            var t = e[i], a = document.getElementById(t);
            null !== a && a.parentNode.removeChild(a)
        }
    },
    subscribe: function (e) {
        return navigator.serviceWorker.ready.then(function (i) {
            i.pushManager.subscribe({userVisibleOnly: !0}).then(function (i) {
                return "subscriptionId" in i ? subscriptionId = i.subscriptionId : subscriptionId = i.endpoint, null != subscriptionId ? (subscriptionId = Jeapie.endpointWorkaround(subscriptionId), e(subscriptionId)) : void 0
            })["catch"](function (e) {
                "denied" === Notification.permission ? (Jeapie.log("Permission for Notifications was denied"), Jeapie.removeWidget(["jeapie-line-widget", "jeapie-push-container", "jeapie-prompt-widget", "jeapie-line-widget-instead-prompt"])) : Jeapie.log("Unable to subscribe to push.", e)
            })
        }), !0
    },
    showWelcomeNotification: function (e, i, t, a, n) {
        if ("chrome" == Jeapie.jeapieMode) {
            var o = {body: i, icon: t, data: {redirect_url: a, device_id: n}}, r = new Notification(e, o);
            r.onclick = function (e) {
                if (e.target && e.target.data && e.target.data.redirect_url && e.target.data.device_id) {
                    var i = {
                        type: "welcome_opened",
                        device_id: e.target.data.device_id,
                        time: Math.floor(Date.now() / 1e3)
                    }, t = Jeapie.getGetUrlWithObject(Jeapie.hostUrl, i, !0);
                    Jeapie.send(t, "get", !1, function () {
                    }), window.location = e.target.data.redirect_url
                } else Jeapie.getSubscription(function (e) {
                    if (e) {
                        var i = {
                            type: "welcome_opened",
                            device_id: Jeapie.md5(e),
                            time: Math.floor(Date.now() / 1e3)
                        }, t = Jeapie.getGetUrlWithObject(Jeapie.hostUrl, i, !0);
                        Jeapie.send(t, "get", !1, function () {
                        })
                    }
                }), window.location = Jeapie.webSiteDomain
            }
        }
    },
    registerNewUser: function (e, i) {
        var t = {
            type: "register",
            os: "chrome" == Jeapie.jeapieMode ? 6 : 7,
            device_id: "chrome" == Jeapie.jeapieMode ? Jeapie.md5(e) : Jeapie.md5(e + Jeapie.appKey),
            os_v: Jeapie.detectBrowser().version,
            lib_v: Jeapie.sdkVersion,
            screen_w: Jeapie.getScreenWidth(),
            screen_h: Jeapie.getScreenHeight(),
            tz: Jeapie.getTimezone(),
            lang: Jeapie.getBrowserlanguage(),
            token: e,
            time: Jeapie.getCurrentTimestamp()
        }, a = Jeapie.getGetUrlWithObject(Jeapie.hostUrl, t, !0);
        Jeapie.send(a, "get", !1, function (e) {
            if (e && e.jeapiewelcome) {
                var t = e.jeapiewelcome;
                Jeapie.showWelcomeNotification(t.title, t.body, t.icon, t.redirect_url, t.device_id)
            }
            return i(e)
        })
    },
    addTag: function (e) {
        Jeapie.getDbValue("Ids", "SubscriptionId", function (i) {
            if (i.target.result) {
                var t = {
                    type: "add_tag",
                    device_id: "chrome" == Jeapie.jeapieMode ? Jeapie.md5(i.target.result.value) : Jeapie.md5(i.target.result.value + Jeapie.appKey),
                    value: e,
                    time: Jeapie.getCurrentTimestamp()
                }, a = Jeapie.getGetUrlWithObject(Jeapie.hostUrl, t, !0);
                Jeapie.send(a, "get", !1, function () {
                })
            }
        })
    },
    setTags: function (e) {
        Jeapie.getDbValue("Ids", "SubscriptionId", function (i) {
            if (i.target.result) {
                var t = {
                    type: "set_tags",
                    device_id: "chrome" == Jeapie.jeapieMode ? Jeapie.md5(i.target.result.value) : Jeapie.md5(i.target.result.value + Jeapie.appKey),
                    value: e,
                    time: Jeapie.getCurrentTimestamp()
                }, a = Jeapie.getGetUrlWithObject(Jeapie.hostUrl, t, !0);
                Jeapie.send(a, "get", !1, function () {
                })
            }
        })
    },
    removeTag: function (e) {
        Jeapie.getDbValue("Ids", "SubscriptionId", function (i) {
            if (i.target.result) {
                var t = {
                    type: "remove_tag",
                    device_id: "chrome" == Jeapie.jeapieMode ? Jeapie.md5(i.target.result.value) : Jeapie.md5(i.target.result.value + Jeapie.appKey),
                    value: e,
                    time: Jeapie.getCurrentTimestamp()
                }, a = Jeapie.getGetUrlWithObject(Jeapie.hostUrl, t, !0);
                Jeapie.send(a, "get", !1, function () {
                })
            }
        })
    },
    removeAllTags: function () {
        Jeapie.getDbValue("Ids", "SubscriptionId", function (e) {
            if (e.target.result) {
                var i = {
                    type: "remove_all_tags",
                    device_id: "chrome" == Jeapie.jeapieMode ? Jeapie.md5(e.target.result.value) : Jeapie.md5(e.target.result.value + Jeapie.appKey),
                    time: Jeapie.getCurrentTimestamp()
                }, t = Jeapie.getGetUrlWithObject(Jeapie.hostUrl, i, !0);
                Jeapie.send(t, "get", !1, function () {
                })
            }
        })
    },
    setAlias: function (e) {
        Jeapie.getDbValue("Ids", "SubscriptionId", function (i) {
            if (i.target.result) {
                var t = {
                    type: "alias",
                    device_id: "chrome" == Jeapie.jeapieMode ? Jeapie.md5(i.target.result.value) : Jeapie.md5(i.target.result.value + Jeapie.appKey),
                    value: e,
                    time: Jeapie.getCurrentTimestamp()
                }, a = Jeapie.getGetUrlWithObject(Jeapie.hostUrl, t, !0);
                Jeapie.send(a, "get", !1, function () {
                })
            }
        })
    },
    setCookie: function (e, i, t) {
        var a = new Date;
        a.setTime(a.getTime() + 24 * t * 60 * 60 * 1e3);
        var n = "; expires=" + a.toUTCString();
        document.cookie = encodeURIComponent(e) + "=" + encodeURIComponent(i) + n + "; path=/"
    },
    checkCookie: function (e) {
        for (var i = e + "=", t = document.cookie.split(";"), a = 0; a < t.length; a++) {
            for (var n = t[a]; " " == n.charAt(0);)n = n.substring(1);
            if (0 == n.indexOf(i))return n.substring(i.length, n.length)
        }
        return ""
    },
    checkBrowser: function () {
        if ("opera" == Jeapie.detectBrowser().name.toLowerCase() || "ie" == Jeapie.detectBrowser().name.toLowerCase() || "firefox" == Jeapie.detectBrowser().name.toLowerCase())return !1;
        if (-1 == document.baseURI.indexOf(Jeapie.webSiteDomain) && !Jeapie.isGravitecSubdomain)return console.log("You must use this SDK only for " + Jeapie.webSiteDomain), !1;
        if (Jeapie.checkIfSafariNotification())Jeapie.jeapieMode = "safari"; else {
            if (!Jeapie.isPushManagerSupported())return Jeapie.log("Push messaging isn't supported."), !1;
            if (!Jeapie.isNotificationsSupported())return Jeapie.log("Notifications aren't supported."), !1;
            if (!Jeapie.isNotificationPermitted())return Jeapie.log("The user has blocked notifications."), !1;
            Jeapie.jeapieMode = "chrome"
        }
        return !0
    },
    getScreenWidth: function () {
        return window.screen ? screen.width : 0
    },
    getScreenHeight: function () {
        return window.screen ? screen.height : 0
    },
    isNotificationsSupported: function () {
        return "showNotification" in ServiceWorkerRegistration.prototype
    },
    isNotificationPermitted: function () {
        return "denied" != Notification.permission
    },
    isPushManagerSupported: function () {
        return "PushManager" in window
    },
    getCurrentTimestamp: function () {
        return Math.floor(Date.now() / 1e3)
    },
    getBrowserlanguage: function () {
        return navigator.language.substring(0, 2)
    },
    checkIfSafariNotification: function () {
        return "safari" in window && "pushNotification" in window.safari
    },
    getTimezone: function () {
        return -60 * (new Date).getTimezoneOffset()
    },
    getIsPushManagerSupported: function (e) {
        return e(Jeapie.isPushManagerSupported())
    },
    isMobileScreen: function () {
        var e = !1;
        return function (i) {
            (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(i) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(i.substr(0, 4))) && (e = !0)
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
        if (~e.indexOf("https://android.googleapis.com/gcm/send")) {
            var i = e.split("https://android.googleapis.com/gcm/send/");
            return i[1]
        }
        return e
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
if (tempJeapie) {
    var isInit = !1, e;
    var item;
    for (item in tempJeapie) {
        if (in_array("init", tempJeapie[item])) {
            isInit = !0;
            if (0 != item) {
                e = tempJeapie[0];
                tempJeapie[0] = tempJeapie[item];
                tempJeapie[item] = e;
            }
        }
    }
    isInit || Jeapie.push(["init"]), Jeapie.processPushes(tempJeapie)
}