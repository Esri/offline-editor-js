/**
 * Timer.js is designed as a centralized timer library to handle timing
 * for an entire application.
 *
 * This version of the library polls the internet and sends messages back
 * to the parent application is internet is enabled or not.
 *
 * NOTE: Run this library inside a webworker process.
 */
importScripts('Poller.js');

var  ___backgroundTimer = null;

/**
 * Local ENUMs (Constants)
 * @type {Object}
 * @returns {*}
 */
this._localEnum = (function(){
    var values = {
        VALIDATION_URL : "http://localhost/offline/test.html",
        VALIDATION_TIMEOUT : 10 * 1000
    }

    return values;
});

this._checkInternet = function(callback){
    var result = null;
    Poller.httpGet(
        this._localEnum().VALIDATION_URL,
        this._localEnum().VALIDATION_TIMEOUT,
        function(msg){
            callback( msg );
        }
    );
}

this._startTimer = function(msg){
    var count = 0;

    ___backgroundTimer = setInterval(function(){

        try{
            var date = new Date();
            self.postMessage({msg:"Timer.js: datetime tick: " + date.toUTCString()});
            self.postMessage({alive:true});
            this._checkInternet(function(evt){
                self.postMessage({net:evt});
            })
        }
        catch(err){
            count++;
            if(count == 3){
                self.postMessage({err:"Timer.js: shutdown timer...too many errors. " + err.message});
                clearInterval(___backgroundTimer);
                self.postMessage({alive:false});
            }
            else{
                self.postMessage({err:"Timer.js: " + err.message + "\n" + err.stack});
                self.postMessage({alive:false});
            }
        }
    }.bind(this),msg.interval);
}

self.addEventListener('message', function(msg) {

    if(msg.data.hasOwnProperty("start") && msg.data.hasOwnProperty("interval")){
        if(msg.data.start == true && ___backgroundTimer == null){
            self.postMessage({msg:"Timer: start message recv'd"});
            this._startTimer(msg.data);
        }
    }
    if(msg.data.hasOwnProperty("running")){
        if(___backgroundTimer){
            self.postMessage({alive:true});
        }
        else{
            self.postMessage({alive:false});
        }
    }
    if(msg.data.hasOwnProperty("kill")){
        clearInterval(___backgroundTimer);
        self.postMessage({alive:false});
    }

}.bind(this), false);
