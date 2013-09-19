/**
 * Poller is a static library for sending data via HTTP requests. You can use it directly
 * without needing to instantiate it via "new".
 * @type {*|{}}
 */
var Poller = Poller || {};

/**
 * Static method that validates if application is online. Provides full request validation
 * on the response payload. You can either use this directly as a wrapper on an HTTP REST
 * request or as a separate validation check.
 * Reference: https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest
 * @param url
 * @param timeout http timeout in milliseconds (ms)
 * @param callback returns boolean {response:true/false}
 */
Poller.httpGet = function(url,timeout,callback)
{
    if(navigator.onLine == true){
        callback(true);
    }
    else if(navigator.onLine == false){
        callback(false);
    }
    else{
        Poller._makeRequest(url,timeout,callback);
    }
}

Poller._makeRequest = function(url,timeout,callback){
    try{
        var xmlHttp = new XMLHttpRequest();
        xmlHttp.callback = callback;
        xmlHttp.onload = Poller._handleRequest;
        xmlHttp.onerror = Poller._error;
        xmlHttp.open( "GET", url, true );
        xmlHttp.timeout = timeout;
        xmlHttp.ontimeout = Poller._handleTimeout;
        xmlHttp.send();
    }
    catch(err){
        this.callback(false);
    }

}

Poller._error = function(){
    this.callback( false );
}

Poller._handleRequest = function(){

    if ( this != null && this.readyState === 4)
    {
        if(this.status === 200){
            this.callback( true );
        }
        else{
            this.callback(undefined);
        }
    }
}

Poller._handleTimeout = function(){
    if (this != null){
        this.callback(false);
    }
}
