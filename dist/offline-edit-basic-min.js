Offline.options={checks:{image:{url:function(){return"http://esri.github.io/offline-editor-js/tiny-image.png?_="+Math.floor(1e9*Math.random())}},active:"image"}},define(["dojo/Evented","dojo/_base/Deferred","dojo/promise/all","dojo/_base/declare","dojo/_base/array","dojo/dom-attr","dojo/dom-style","dojo/query","dojo/on","esri/config","esri/layers/GraphicsLayer","esri/layers/FeatureLayer","esri/graphic"],function(a,b,c,d,e,f,g,h,i,j,k,l,m){"use strict"
return d("O.esri.Edit.OfflineEditBasic",[a],{_onlineStatus:"online",_featureLayers:{},_editStore:new O.esri.Edit.EditStorePOLS,_defaultXhrTimeout:15e3,_autoOfflineDetect:!0,_esriFieldTypeOID:"",ONLINE:"online",OFFLINE:"offline",RECONNECTING:"reconnecting",proxyPath:null,DB_NAME:"features_store",DB_OBJECTSTORE_NAME:"features",DB_UID:"objectid",events:{EDITS_SENT:"edits-sent",EDITS_ENQUEUED:"edits-enqueued",EDITS_ENQUEUED_ERROR:"edits-enqueued-error"},constructor:function(a){a&&a.hasOwnProperty("autoDetect")&&(this._autoOfflineDetect=a.autoDetect)},extend:function(a,d){var f=[],g=this
a.offlineExtended=!0,!a.loaded||null===a._url,a.objectIdField=this.DB_UID
for(var h=0;h<a.fields.length;h++)if("esriFieldTypeOID"===a.fields[h].type){this._esriFieldTypeOID=a.fields[h].name
break}var i=null
a.url&&(i=a.url,this._featureLayers[a.url]=a),this._editStore._isDBInit||f.push(this._initializeDB(i)),a._applyEdits=a.applyEdits,a.applyEdits=function(d,e,f,h,i){var j=[]
if(g.getOnlineStatus()===g.ONLINE){var k=a._applyEdits(d,e,f,function(){g.emit(g.events.EDITS_SENT,arguments),h&&h.apply(this,arguments)},i)
return k}var l=new b,m={addResults:[],updateResults:[],deleteResults:[]},n={},o=d||[]
return o.forEach(function(a){var c=new b,d=this._getNextTempId()
a.attributes[this.objectIdField]=d
var e=this
this._validateFeature(a,this.url,g._editStore.ADD).then(function(b){b.success?e._pushValidatedAddFeatureToDB(e,a,b.operation,m,d,c):c.resolve(!0)},function(a){c.reject(a)}),j.push(c)},this),e=e||[],e.forEach(function(a){var c=new b,d=a.attributes[this.objectIdField]
n[d]=a
var e=this
this._validateFeature(a,this.url,g._editStore.UPDATE).then(function(b){b.success?e._pushValidatedUpdateFeatureToDB(e,a,b.operation,m,d,c):c.resolve(!0)},function(a){c.reject(a)}),j.push(c)},this),f=f||[],f.forEach(function(a){var c=new b,d=a.attributes[this.objectIdField],e=this
this._validateFeature(a,this.url,g._editStore.DELETE).then(function(b){b.success?e._pushValidatedDeleteFeatureToDB(e,a,b.operation,m,d,c):c.resolve(!0)},function(a){c.reject(a)}),j.push(c)},this),c(j).then(function(a){for(var b=!0,c=0;c<a.length;c++)a[c]===!1&&(b=!1)
b===!0?g.emit(g.events.EDITS_ENQUEUED,m):g.emit(g.events.EDITS_ENQUEUED_ERROR,m),this._editHandler(m,o,n,h,i,l)}.bind(this)),l},a.getUsage=function(a){g._editStore.getUsage(function(b,c){a(b,c)})},a.resetDatabase=function(a){g._editStore.resetEditsQueue(function(b,c){a(b,c)})},a.pendingEditsCount=function(a){g._editStore.pendingEditsCount(function(b){a(b)})},a.getFeatureDefinition=function(a,b,c,d){var e={layerDefinition:a,featureSet:{features:b,geometryType:c}}
d(e)},a.getAllEditsArray=function(a){g._editStore.getAllEditsArray(function(b,c){"end"==c?a(!0,b):a(!1,c)})},a._pushValidatedDeleteFeatureToDB=function(a,b,c,d,e,f){g._editStore.pushEdit(c,a.url,b,function(a,b){if(a){d.deleteResults.push({success:!0,error:null,objectId:e})
var c={}
c[g.DB_UID]=e}else d.deleteResults.push({success:!1,error:b,objectId:e})
f.resolve(a)})},a._pushValidatedUpdateFeatureToDB=function(a,b,c,d,e,f){g._editStore.pushEdit(c,a.url,b,function(a,b){if(a){d.updateResults.push({success:!0,error:null,objectId:e})
var c={}
c[g.DB_UID]=e}else d.updateResults.push({success:!1,error:b,objectId:e})
f.resolve(a)})},a._pushValidatedAddFeatureToDB=function(a,b,c,d,e,f){g._editStore.pushEdit(c,a.url,b,function(a,b){if(a){d.addResults.push({success:!0,error:null,objectId:e})
var c={}
c[g.DB_UID]=e}else d.addResults.push({success:!1,error:b,objectId:e})
f.resolve(a)})},a._validateFeature=function(c,d,e){var f=new b,h=d+"/"+c.attributes[g.DB_UID]
return g._editStore.getEdit(h,function(b,d){if(b)switch(e){case g._editStore.ADD:f.resolve({success:!0,graphic:c,operation:e})
break
case g._editStore.UPDATE:d.operation==g._editStore.ADD&&(c.operation=g._editStore.ADD,e=g._editStore.ADD),f.resolve({success:!0,graphic:c,operation:e})
break
case g._editStore.DELETE:var h=!0
d.operation==g._editStore.ADD&&a._deleteTemporaryFeature(c,function(a,b){a||(h=!1)}),f.resolve({success:h,graphic:c,operation:e})}else"Id not found"==d?f.resolve({success:!0,graphic:c,operation:e}):f.reject(c)}),f},a._deleteTemporaryFeature=function(b,c){g._editStore["delete"](a.url,b,function(a,b){c(a,b)})},a._getFilesFromForm=function(a){var b=[],c=e.filter(a.elements,function(a){return"file"===a.type})
return c.forEach(function(a){b.push.apply(b,a.files)},this),b},a._getNextTempId=function(){return this._nextTempId--},c(f).then(function(b){b[0].success?(g._editStore.getNextLowestTempId(a,function(b,c){"success"===c?a._nextTempId=b:a._nextTempId=-1}),g._autoOfflineDetect&&(Offline.on("up",function(){g.goOnline(function(a,b){})}),Offline.on("down",function(){g.goOffline()})),d(!0,null)):d(!1,b[0].error)})},goOffline:function(){this._onlineStatus=this.OFFLINE},goOnline:function(a){this._onlineStatus=this.RECONNECTING,this._replayStoredEdits(function(b,c){this._onlineStatus=this.ONLINE,a&&a(b,c)}.bind(this))},getOnlineStatus:function(){return this._onlineStatus},_initializeDB:function(a){var c=new b,d=this._editStore
return d.dbName=this.DB_NAME,d.objectStoreName=this.DB_OBJECTSTORE_NAME,d.objectId=this.DB_UID,d.init(function(a,b){a?c.resolve({success:!0,error:null}):c.reject({success:!1,error:null})}),c},_replayStoredEdits:function(a){var b,d={},e=this,f=[],g=[],h=[],i=[],j=[],k=this._featureLayers,l=this._editStore
this._editStore.getAllEditsArray(function(n,o){if(n.length>0){j=n
for(var p=j.length,q=0;p>q;q++){b=k[j[q].layer],b.__onEditsComplete=b.onEditsComplete,b.onEditsComplete=function(){},f=[],g=[],h=[],i=[]
var r=new m(j[q].graphic)
switch(j[q].operation){case l.ADD:for(var s=0;s<b.graphics.length;s++){var t=b.graphics[s]
if(t.attributes[b.objectIdField]===r.attributes[b.objectIdField]){b.remove(t)
break}}i.push(r.attributes[b.objectIdField]),delete r.attributes[b.objectIdField],f.push(r)
break
case l.UPDATE:g.push(r)
break
case l.DELETE:h.push(r)}d[q]=e._internalApplyEditsAll(b,j[q].id,i,f,g,h)}var u=c(d)
u.then(function(b){a(!0,b)},function(b){a(!1,b)})}else a(!0,[])})},_cleanSuccessfulEditsDatabaseRecords:function(a,b){if(0!==Object.keys(a).length){var d=[],e=[]
for(var f in a)if(a.hasOwnProperty(f)){var g=a[f],h={}
g.updateResults.length>0&&(g.updateResults[0].success?(h.layer=g.layer,h.id=g.updateResults[0].objectId,d.push(h)):e.push(g)),g.deleteResults.length>0&&(g.deleteResults[0].success?(h.layer=g.layer,h.id=g.deleteResults[0].objectId,d.push(h)):e.push(g)),g.addResults.length>0&&(g.addResults[0].success?(h.layer=g.layer,h.id=g.tempId,d.push(h)):e.push(g))}for(var i={},j=d.length,k=0;j>k;k++)i[k]=this._updateDatabase(d[k])
var l=c(i)
l.then(function(a){e.length>0?b(!1,a):b(!0,a)},function(a){b(!1,a)})}else b(!0,{})},_updateDatabase:function(a){var c=new b,d={}
return d.attributes={},d.attributes[this.DB_UID]=a.id,this._editStore["delete"](a.layer,d,function(a,b){a?c.resolve({success:!0,error:null}):c.reject({success:!1,error:b})}.bind(this)),c.promise},_internalApplyEditsAll:function(a,c,d,e,f,g){var h=this,i=new b
return this._makeEditRequest(a,e,f,g,function(b,f,g){if(b.length>0){var j=""
b[0].hasOwnProperty("objectid")&&(j="objectid"),b[0].hasOwnProperty("objectId")&&(j="objectId"),b[0].hasOwnProperty("OBJECTID")&&(j="OBJECTID"),e[0].attributes[h._esriFieldTypeOID]=b[0][j]
var k=new m(e[0].geometry,null,e[0].attributes)
a.add(k)}h._cleanDatabase(a,d,b,f,g).then(function(e){i.resolve({id:c,layer:a.url,tempId:d,addResults:b,updateResults:f,deleteResults:g,databaseResults:e,databaseErrors:null,syncError:null})},function(e){i.resolve({id:c,layer:a.url,tempId:d,addResults:b,updateResults:f,deleteResults:g,databaseResults:null,databaseErrors:e,syncError:e})})},function(b){a.onEditsComplete=a.__onEditsComplete,delete a.__onEditsComplete,i.reject(b)}),i.promise},_cleanDatabase:function(a,c,d,e,f){var g=new b,h=null
e.length>0&&e[0].success&&(h=e[0].objectId),f.length>0&&f[0].success&&(h=f[0].objectId),d.length>0&&d[0].success&&(h=c)
var i={}
return i.attributes={},i.attributes[this.DB_UID]=h,this._editStore["delete"](a.url,i,function(a,b){a?g.resolve({success:!0,error:null,id:h}):g.reject({success:!1,error:b,id:h})}),g.promise},_makeEditRequest:function(a,b,c,d,f,g){var h="f=json",i="",j="",k=""
if(b.length>0&&(e.forEach(b,function(a){a.hasOwnProperty("infoTemplate")&&delete a.infoTemplate},this),i="&adds="+encodeURIComponent(JSON.stringify(b))),c.length>0&&(e.forEach(c,function(a){a.hasOwnProperty("infoTemplate")&&delete a.infoTemplate},this),j="&updates="+encodeURIComponent(JSON.stringify(c))),d.length>0){var l=d[0].attributes[this.DB_UID]
k="&deletes="+l}var m=h+i+j+k
a.hasOwnProperty("credential")&&a.credential&&a.credential.hasOwnProperty("token")&&a.credential.token&&(m=m+"&token="+a.credential.token)
var n=this.proxyPath?this.proxyPath+"?"+a.url:a.url,o=new XMLHttpRequest
o.open("POST",n+"/applyEdits",!0),o.setRequestHeader("Content-type","application/x-www-form-urlencoded"),o.onload=function(){if(200===o.status&&""!==o.responseText)try{var a=JSON.parse(this.responseText)
f(a.addResults,a.updateResults,a.deleteResults)}catch(b){g("Unable to parse xhr response",o)}},o.onerror=function(a){g(a)},o.ontimeout=function(){g("xhr timeout error")},o.timeout=this._defaultXhrTimeout,o.send(m)},_parseResponsesArray:function(a,b){var c=0
for(var d in a)a.hasOwnProperty(d)&&(a[d].addResults.forEach(function(a){a.success||c++}),a[d].updateResults.forEach(function(a){a.success||c++}),a[d].deleteResults.forEach(function(a){a.success||c++}))
b(!(c>0))}})}),"undefined"!=typeof O?O.esri.Edit={}:(O={},O.esri={Edit:{}}),O.esri.Edit.EditStorePOLS=function(){"use strict"
this._db=null,this._isDBInit=!1,this.dbName="features_store",this.objectStoreName="features",this.objectId="objectid",this.ADD="add",this.UPDATE="update",this.DELETE="delete",this.FEATURE_LAYER_JSON_ID="feature-layer-object-1001",this.FEATURE_COLLECTION_ID="feature-collection-object-1001",this.isSupported=function(){return!!window.indexedDB},this.pushEdit=function(a,b,c,d){var e={id:b+"/"+c.attributes[this.objectId],operation:a,layer:b,type:c.geometry.type,graphic:c.toJson()}
if("undefined"==typeof c.attributes[this.objectId])d(!1,"editsStore.pushEdit() - failed to insert undefined objectId into database. Did you set offlineEdit.DB_UID? "+JSON.stringify(c.attributes))
else{var f=this._db.transaction([this.objectStoreName],"readwrite")
f.oncomplete=function(a){d(!0)},f.onerror=function(a){d(!1,a.target.error.message)}
var g=f.objectStore(this.objectStoreName)
g.put(e)}},this.getEdit=function(a,b){var c=this._db.transaction([this.objectStoreName],"readwrite").objectStore(this.objectStoreName)
if("undefined"==typeof a)return void b(!1,"id is undefined.")
var d=c.get(a)
d.onsuccess=function(){var c=d.result
c&&c.id==a?b(!0,c):b(!1,"Id not found")},d.onerror=function(a){b(!1,a)}},this.getAllEditsArray=function(a){var b=[]
if(null!==this._db){var c=this.FEATURE_LAYER_JSON_ID,d=this.FEATURE_COLLECTION_ID,e=this._db.transaction([this.objectStoreName]).objectStore(this.objectStoreName).openCursor()
e.onsuccess=function(e){var f=e.target.result
f&&f.value&&f.value.id?(f.value.id!==c&&f.value.id!==d&&b.push(f.value),f["continue"]()):a(b,"end")}.bind(this),e.onerror=function(b){a(null,b)}}else a(null,"no db")},this.getNextLowestTempId=function(a,b){var c=[],d=this
if(null!==this._db){var e=this.FEATURE_LAYER_JSON_ID,f=this.FEATURE_COLLECTION_ID,g=this._db.transaction([this.objectStoreName]).objectStore(this.objectStoreName).openCursor()
g.onsuccess=function(g){var h=g.target.result
if(h&&h.value&&h.value.id)h.value.id!==e&&h.value.id!==f&&h.value.layer===a.url&&"add"===h.value.operation&&c.push(h.value.graphic.attributes[d.objectId]),h["continue"]()
else if(0===c.length)b(-1,"success")
else{var i=c.filter(function(a){return!isNaN(a)}),j=Math.min.apply(Math,i)
b(j-1,"success")}}.bind(this),g.onerror=function(a){b(null,a)}}else b(null,"no db")},this.updateExistingEdit=function(a,b,c,d){var e=this._db.transaction([this.objectStoreName],"readwrite").objectStore(this.objectStoreName),f=e.get(c.attributes[this.objectId])
f.onsuccess=function(){f.result
var g={id:b+"/"+c.attributes[this.objectId],operation:a,layer:b,graphic:c.toJson()},h=e.put(g)
h.onsuccess=function(){d(!0)},h.onerror=function(a){d(!1,a)}}.bind(this)},this["delete"]=function(a,b,c){var d=this._db,e=null,f=this,g=a+"/"+b.attributes[this.objectId]
require(["dojo/Deferred"],function(a){e=new a,f.editExists(g).then(function(a){e.then(function(a){f.editExists(g).then(function(a){c(!1)},function(a){c(!0)})},function(a){c(!1,a)})
var b=d.transaction([f.objectStoreName],"readwrite").objectStore(f.objectStoreName),h=b["delete"](g)
h.onsuccess=function(){e.resolve(!0)},h.onerror=function(a){e.reject({success:!1,error:a})}},function(a){c(!1,a)})})},this.resetEditsQueue=function(a){var b=this._db.transaction([this.objectStoreName],"readwrite").objectStore(this.objectStoreName).clear()
b.onsuccess=function(b){setTimeout(function(){a(!0)},0)},b.onerror=function(b){a(!1,b)}},this.pendingEditsCount=function(a){var b=0,c=this.FEATURE_LAYER_JSON_ID,d=this.FEATURE_COLLECTION_ID,e=this._db.transaction([this.objectStoreName],"readwrite"),f=e.objectStore(this.objectStoreName)
f.openCursor().onsuccess=function(e){var f=e.target.result
f&&f.value&&f.value.id?(f.value.id!==c&&f.value.id!==d&&b++,f["continue"]()):a(b)}},this.editExists=function(a){var b=this._db,c=null,d=this
return require(["dojo/Deferred"],function(e){c=new e
var f=b.transaction([d.objectStoreName],"readwrite").objectStore(d.objectStoreName),g=f.get(a)
g.onsuccess=function(){var b=g.result
b&&b.id==a?c.resolve({success:!0,error:null}):c.reject({success:!1,error:"objectId is not a match."})},g.onerror=function(a){c.reject({success:!1,error:a})}}),c},this.getUsage=function(a){var b=this.FEATURE_LAYER_JSON_ID,c=this.FEATURE_COLLECTION_ID,d={sizeBytes:0,editCount:0},e=this._db.transaction([this.objectStoreName]).objectStore(this.objectStoreName).openCursor()
e.onsuccess=function(e){var f=e.target.result
if(f&&f.value&&f.value.id){var g=f.value,h=JSON.stringify(g)
d.sizeBytes+=h.length,f.value.id!==b&&f.value.id!==c&&(d.editCount+=1),f["continue"]()}else a(d,null)},e.onerror=function(b){a(null,b)}},this.init=function(a){var b=indexedDB.open(this.dbName,11)
a=a||function(a){}.bind(this),b.onerror=function(b){a(!1,b.target.errorCode)}.bind(this),b.onupgradeneeded=function(a){var b=a.target.result
b.objectStoreNames.contains(this.objectStoreName)&&b.deleteObjectStore(this.objectStoreName),b.createObjectStore(this.objectStoreName,{keyPath:"id"})}.bind(this),b.onsuccess=function(b){this._db=b.target.result,this._isDBInit=!0,a(!0,null)}.bind(this)}}
