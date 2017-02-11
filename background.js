window.OneSignal = window.OneSignal || [];
var initOptions = {
    appId: "ce842eda-dcf8-4c48-930e-208e6c7b0db4",
    subdomainName: 'gudz',
    autoRegister: true,
    notifyButton: {
        enable: true
    }
};

OneSignal.push(function() {
    OneSignal.init(initOptions);
});