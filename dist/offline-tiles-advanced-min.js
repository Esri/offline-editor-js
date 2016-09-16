define(["dojo/query","dojo/request","dojo/_base/declare","esri/layers/LOD","esri/geometry/Point","esri/geometry/Extent","esri/layers/TileInfo","esri/SpatialReference","esri/geometry/Polygon","esri/layers/TiledMapServiceLayer"],function(a,b,c,d,e,f,g,h,i,j){"use strict"
return c("O.esri.Tiles.OfflineTilesAdvanced",[j],{tileInfo:null,_imageType:"",_level:null,_minZoom:null,_maxZoom:null,_tilesCore:null,_secure:!1,constructor:function(a,b,c,d){this._isLocalStorage()===!1&&(alert("OfflineTiles Library not supported on this browser."),b(!1)),void 0===d||null===d?(this.DB_NAME="offline_tile_store",this.DB_OBJECTSTORE_NAME="tilepath",this.offline_id_manager="offline_id_manager"):(this.DB_NAME=d.dbName,this.DB_OBJECTSTORE_NAME=d.objectStoreName,void 0===d.offlineIdManager||null===d.offlineIdManger?this.offline_id_manager="offline_id_manager":this.offline_id_manager=d.offlineIdManager),this._tilesCore=new O.esri.Tiles.TilesCore,this._self=this,this._lastTileUrl="",this._imageType="",this._getTileUrl=this.getTileUrl
var e=!0
return"undefined"==typeof c&&null==c||(e=c),this.showBlankTiles=!0,this.offline={online:e,store:new O.esri.Tiles.TilesStore,proxyPath:null},this.offline.store.isSupported()?(this.offline.store.dbName=this.DB_NAME,this.offline.store.objectStoreName=this.DB_OBJECTSTORE_NAME,this.offline.store.init(function(c){c&&this._getTileInfoPrivate(a,function(a){b(a)})}.bind(this._self)),void 0):b(!1,"indexedDB not supported")},getTileUrl:function(b,c,d){this._level=b
var e,f=this,g=window.localStorage[this.offline_id_manager]
if(void 0===g||""===g)e=""
else{var h=JSON.parse(g)
h.credentials.forEach(function(a){-1!==f.url.indexOf(a.server)&&(e="?token="+a.token)})}var i=this.url+"/tile/"+b+"/"+c+"/"+d+e
if(this.offline.online)return this._lastTileUrl=i,i
i=i.split("?")[0]
var j="void:/"+b+"/"+c+"/"+d,k=null
return this._tilesCore._getTiles(k,this._imageType,i,j,this.offline.store,a,this.showBlankTiles),j},getBasemapLayer:function(a){var b=a.layerIds[0]
return a.getLayer(b)},getLevelEstimation:function(a,b,c){var d=new O.esri.Tiles.TilingScheme(this),e=d.getAllCellIdsInExtent(a,b),f={level:b,tileCount:e.length,sizeBytes:e.length*c}
return f},getLevel:function(){return this._level},getMaxZoom:function(a){null==this._maxZoom&&(this._maxZoom=this.tileInfo.lods[this.tileInfo.lods.length-1].level),a(this._maxZoom)},getMinZoom:function(a){null==this._minZoom&&(this._minZoom=this.tileInfo.lods[0].level),a(this._minZoom)},getMinMaxLOD:function(a,b){var c={},d=this.getMap(),e=d.getLevel()-Math.abs(a),f=d.getLevel()+b
return null!=this._maxZoom&&null!=this._minZoom?(c.max=Math.min(this._maxZoom,f),c.min=Math.max(this._minZoom,e)):(this.getMinZoom(function(a){c.min=Math.max(a,e)}),this.getMaxZoom(function(a){c.max=Math.min(a,f)})),c},prepareForOffline:function(a,b,c,d){this._tilesCore._createCellsForOffline(this,a,b,c,function(a){this._doNextTile(0,a,d)}.bind(this))},goOffline:function(){this.offline.online=!1},goOnline:function(){this.offline.online=!0,this.refresh()},isOnline:function(){return this.offline.online},deleteAllTiles:function(a){var b=this.offline.store
b.deleteAll(a)},getOfflineUsage:function(a){var b=this.offline.store
b.usedSpace(a)},getTilePolygons:function(a){this._tilesCore._getTilePolygons(this.offline.store,this.url,this,a)},saveToFile:function(a,b){this._tilesCore._saveToFile(a,this.offline.store,b)},loadFromFile:function(a,b){this._tilesCore._loadFromFile(a,this.offline.store,b)},estimateTileSize:function(a){this._tilesCore._estimateTileSize(b,this._lastTileUrl,this.offline.proxyPath,this.offline_id_manager,a)},getExtentBuffer:function(a,b){return b.xmin-=a,b.ymin-=a,b.xmax+=a,b.ymax+=a,b},getTileUrlsByExtent:function(a,b){var c=new O.esri.Tiles.TilingScheme(this),d=c.getAllCellIdsInExtent(a,b),e=[]
return d.forEach(function(a){e.push(this.url+"/"+b+"/"+a[1]+"/"+a[0])}.bind(this)),e},_doNextTile:function(a,b,c){var d=b[a],e=this._getTileUrl(d.level,d.row,d.col)
this._tilesCore._storeTile(e,this.offline.proxyPath,this.offline.store,function(e,f){e||(f={cell:d,msg:f})
var g=c({countNow:a,countMax:b.length,cell:d,error:f,finishedDownloading:!1})
g||a===b.length-1?c({finishedDownloading:!0,cancelRequested:g}):this._doNextTile(a+1,b,c)}.bind(this))},_isLocalStorage:function(){var a="test"
try{return localStorage.setItem(a,a),localStorage.removeItem(a),!0}catch(b){return!1}},_parseTileInfo:function(a,b,c){b.offline.online===!1&&a===!1&&void 0!==localStorage.__offlineTileInfo?a=localStorage.__offlineTileInfo:b.offline.online===!1&&a===!1&&void 0===localStorage.__offlineTileInfo&&alert("There was a problem retrieving tiled map info in OfflineTilesEnablerLayer."),b._tilesCore._parseGetTileInfo(a,function(a){b.layerInfos=a.resultObj.layers,b.minScale=a.resultObj.minScale,b.maxScale=a.resultObj.maxScale,b.tileInfo=a.tileInfo,b._imageType=b.tileInfo.format.toLowerCase(),b.fullExtent=a.fullExtent,b.spatialReference=b.tileInfo.spatialReference,b.initialExtent=a.initExtent,b.loaded=!0,b.onLoad(b),c(!0)})},_getTileInfoPrivate:function(a,b){var c,d=this,e=new XMLHttpRequest,f=window.localStorage[this.offline_id_manager]
if(void 0===f||""===f)c=""
else{var g=JSON.parse(f)
g.credentials.forEach(function(b){-1!==a.indexOf(b.server)&&(c="&token="+b.token)})}var h=null!=d.offline.proxyPath?d.offline.proxyPath+"?"+a+"?f=pjson"+c:a+"?f=pjson"+c
e.open("GET",h,!0),e.onload=function(){if(200===e.status&&""!==e.responseText){var c=this.response,f=this.response.replace(/\\'/g,"'"),g=JSON.parse(f)
"error"in g?"code"in g.error&&(499!=g.error.code&&498!=g.error.code||require(["esri/IdentityManager"],function(c){var e=c.findCredential(a)
void 0===e?c.getCredential(a).then(function(){d._secure=!0,window.localStorage[d.offline_id_manager]=JSON.stringify(c.toJson()),d._getTileInfoPrivate(a,b)}):d._getTileInfoPrivate(a,b)})):d._parseTileInfo(c,d,b)}else b(!1)},e.onerror=function(a){b(!1)},e.send(null)}})}),"undefined"!=typeof O?O.esri.Tiles={}:(O={},O.esri={Tiles:{}}),O.esri.Tiles.Base64Utils={},O.esri.Tiles.Base64Utils.outputTypes={Base64:0,Hex:1,String:2,Raw:3},O.esri.Tiles.Base64Utils.addWords=function(a,b){var c=(65535&a)+(65535&b),d=(a>>16)+(b>>16)+(c>>16)
return d<<16|65535&c},O.esri.Tiles.Base64Utils.stringToWord=function(a){for(var b=8,c=(1<<b)-1,d=[],e=0,f=a.length*b;f>e;e+=b)d[e>>5]|=(a.charCodeAt(e/b)&c)<<e%32
return d},O.esri.Tiles.Base64Utils.wordToString=function(a){for(var b=8,c=(1<<b)-1,d=[],e=0,f=32*a.length;f>e;e+=b)d.push(String.fromCharCode(a[e>>5]>>>e%32&c))
return d.join("")},O.esri.Tiles.Base64Utils.wordToHex=function(a){for(var b="0123456789abcdef",c=[],d=0,e=4*a.length;e>d;d++)c.push(b.charAt(a[d>>2]>>d%4*8+4&15)+b.charAt(a[d>>2]>>d%4*8&15))
return c.join("")},O.esri.Tiles.Base64Utils.wordToBase64=function(a){for(var b="=",c="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",d=[],e=0,f=4*a.length;f>e;e+=3)for(var g=(a[e>>2]>>8*(e%4)&255)<<16|(a[e+1>>2]>>8*((e+1)%4)&255)<<8|a[e+2>>2]>>8*((e+2)%4)&255,h=0;4>h;h++)8*e+6*h>32*a.length?d.push(b):d.push(c.charAt(g>>6*(3-h)&63))
return d.join("")},O.esri.Tiles.Base64String={compressToUTF16:function(a){var b,c,d,e=[],f=0
for(a=this.compress(a),b=0;b<a.length;b++)switch(c=a.charCodeAt(b),f++){case 0:e.push(String.fromCharCode((c>>1)+32)),d=(1&c)<<14
break
case 1:e.push(String.fromCharCode(d+(c>>2)+32)),d=(3&c)<<13
break
case 2:e.push(String.fromCharCode(d+(c>>3)+32)),d=(7&c)<<12
break
case 3:e.push(String.fromCharCode(d+(c>>4)+32)),d=(15&c)<<11
break
case 4:e.push(String.fromCharCode(d+(c>>5)+32)),d=(31&c)<<10
break
case 5:e.push(String.fromCharCode(d+(c>>6)+32)),d=(63&c)<<9
break
case 6:e.push(String.fromCharCode(d+(c>>7)+32)),d=(127&c)<<8
break
case 7:e.push(String.fromCharCode(d+(c>>8)+32)),d=(255&c)<<7
break
case 8:e.push(String.fromCharCode(d+(c>>9)+32)),d=(511&c)<<6
break
case 9:e.push(String.fromCharCode(d+(c>>10)+32)),d=(1023&c)<<5
break
case 10:e.push(String.fromCharCode(d+(c>>11)+32)),d=(2047&c)<<4
break
case 11:e.push(String.fromCharCode(d+(c>>12)+32)),d=(4095&c)<<3
break
case 12:e.push(String.fromCharCode(d+(c>>13)+32)),d=(8191&c)<<2
break
case 13:e.push(String.fromCharCode(d+(c>>14)+32)),d=(16383&c)<<1
break
case 14:e.push(String.fromCharCode(d+(c>>15)+32,(32767&c)+32)),f=0}return e.push(String.fromCharCode(d+32)),e.join("")},decompressFromUTF16:function(a){for(var b,c,d=[],e=0,f=0;f<a.length;){switch(c=a.charCodeAt(f)-32,e++){case 0:b=c<<1
break
case 1:d.push(String.fromCharCode(b|c>>14)),b=(16383&c)<<2
break
case 2:d.push(String.fromCharCode(b|c>>13)),b=(8191&c)<<3
break
case 3:d.push(String.fromCharCode(b|c>>12)),b=(4095&c)<<4
break
case 4:d.push(String.fromCharCode(b|c>>11)),b=(2047&c)<<5
break
case 5:d.push(String.fromCharCode(b|c>>10)),b=(1023&c)<<6
break
case 6:d.push(String.fromCharCode(b|c>>9)),b=(511&c)<<7
break
case 7:d.push(String.fromCharCode(b|c>>8)),b=(255&c)<<8
break
case 8:d.push(String.fromCharCode(b|c>>7)),b=(127&c)<<9
break
case 9:d.push(String.fromCharCode(b|c>>6)),b=(63&c)<<10
break
case 10:d.push(String.fromCharCode(b|c>>5)),b=(31&c)<<11
break
case 11:d.push(String.fromCharCode(b|c>>4)),b=(15&c)<<12
break
case 12:d.push(String.fromCharCode(b|c>>3)),b=(7&c)<<13
break
case 13:d.push(String.fromCharCode(b|c>>2)),b=(3&c)<<14
break
case 14:d.push(String.fromCharCode(b|c>>1)),b=(1&c)<<15
break
case 15:d.push(String.fromCharCode(b|c)),e=0}f++}return this.decompress(d.join(""))},_keyStr:"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",decompress:function(a){for(var b,c,d,e,f,g,h,i=[],j=1,k=a.charCodeAt(0)>>8;j<2*a.length&&(j<2*a.length-1||0===k);)j%2===0?(b=a.charCodeAt(j/2)>>8,c=255&a.charCodeAt(j/2),d=j/2+1<a.length?a.charCodeAt(j/2+1)>>8:NaN):(b=255&a.charCodeAt((j-1)/2),(j+1)/2<a.length?(c=a.charCodeAt((j+1)/2)>>8,d=255&a.charCodeAt((j+1)/2)):c=d=NaN),j+=3,e=b>>2,f=(3&b)<<4|c>>4,g=(15&c)<<2|d>>6,h=63&d,isNaN(c)||j==2*a.length+1&&k?g=h=64:(isNaN(d)||j==2*a.length&&k)&&(h=64),i.push(this._keyStr.charAt(e)),i.push(this._keyStr.charAt(f)),i.push(this._keyStr.charAt(g)),i.push(this._keyStr.charAt(h))
return i.join("")},compress:function(a){var b,c,d,e,f,g,h,i,j=[],k=1,l=0,m=!1
for(a=a.replace(/[^A-Za-z0-9\+\/\=]/g,"");l<a.length;)f=this._keyStr.indexOf(a.charAt(l++)),g=this._keyStr.indexOf(a.charAt(l++)),h=this._keyStr.indexOf(a.charAt(l++)),i=this._keyStr.indexOf(a.charAt(l++)),c=f<<2|g>>4,d=(15&g)<<4|h>>2,e=(3&h)<<6|i,k%2===0?(b=c<<8,m=!0,64!=h&&(j.push(String.fromCharCode(b|d)),m=!1),64!=i&&(b=e<<8,m=!0)):(j.push(String.fromCharCode(b|c)),m=!1,64!=h&&(b=d<<8,m=!0),64!=i&&(j.push(String.fromCharCode(b|e)),m=!1)),k+=3
return m?(j.push(String.fromCharCode(b)),j=j.join(""),j=String.fromCharCode(256|j.charCodeAt(0))+j.substring(1)):j=j.join(""),j}},O.esri.Tiles.LZString=function(){function a(a,b){if(!e[a]){e[a]={}
for(var c=0;c<a.length;c++)e[a][a.charAt(c)]=c}return e[a][b]}var b=String.fromCharCode,c="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",d="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-$",e={},f={compressToBase64:function(a){if(null==a)return""
var b=f._compress(a,6,function(a){return c.charAt(a)})
switch(b.length%4){default:case 0:return b
case 1:return b+"==="
case 2:return b+"=="
case 3:return b+"="}},decompressFromBase64:function(b){return null==b?"":""==b?null:f._decompress(b.length,32,function(d){return a(c,b.charAt(d))})},compressToUTF16:function(a){return null==a?"":f._compress(a,15,function(a){return b(a+32)})+" "},decompressFromUTF16:function(a){return null==a?"":""==a?null:f._decompress(a.length,16384,function(b){return a.charCodeAt(b)-32})},compressToUint8Array:function(a){for(var b=f.compress(a),c=new Uint8Array(2*b.length),d=0,e=b.length;e>d;d++){var g=b.charCodeAt(d)
c[2*d]=g>>>8,c[2*d+1]=g%256}return c},decompressFromUint8Array:function(a){if(null===a||void 0===a)return f.decompress(a)
for(var c=new Array(a.length/2),d=0,e=c.length;e>d;d++)c[d]=256*a[2*d]+a[2*d+1]
var g=[]
return c.forEach(function(a){g.push(b(a))}),f.decompress(g.join(""))},compressToEncodedURIComponent:function(a){return null==a?"":f._compress(a,6,function(a){return d.charAt(a)})},decompressFromEncodedURIComponent:function(b){return null==b?"":""==b?null:(b=b.replace(/ /g,"+"),f._decompress(b.length,32,function(c){return a(d,b.charAt(c))}))},compress:function(a){return f._compress(a,16,function(a){return b(a)})},_compress:function(a,b,c){if(null==a)return""
var d,e,f,g={},h={},i="",j="",k="",l=2,m=3,n=2,o=[],p=0,q=0
for(f=0;f<a.length;f+=1)if(i=a.charAt(f),Object.prototype.hasOwnProperty.call(g,i)||(g[i]=m++,h[i]=!0),j=k+i,Object.prototype.hasOwnProperty.call(g,j))k=j
else{if(Object.prototype.hasOwnProperty.call(h,k)){if(k.charCodeAt(0)<256){for(d=0;n>d;d++)p<<=1,q==b-1?(q=0,o.push(c(p)),p=0):q++
for(e=k.charCodeAt(0),d=0;8>d;d++)p=p<<1|1&e,q==b-1?(q=0,o.push(c(p)),p=0):q++,e>>=1}else{for(e=1,d=0;n>d;d++)p=p<<1|e,q==b-1?(q=0,o.push(c(p)),p=0):q++,e=0
for(e=k.charCodeAt(0),d=0;16>d;d++)p=p<<1|1&e,q==b-1?(q=0,o.push(c(p)),p=0):q++,e>>=1}l--,0==l&&(l=Math.pow(2,n),n++),delete h[k]}else for(e=g[k],d=0;n>d;d++)p=p<<1|1&e,q==b-1?(q=0,o.push(c(p)),p=0):q++,e>>=1
l--,0==l&&(l=Math.pow(2,n),n++),g[j]=m++,k=String(i)}if(""!==k){if(Object.prototype.hasOwnProperty.call(h,k)){if(k.charCodeAt(0)<256){for(d=0;n>d;d++)p<<=1,q==b-1?(q=0,o.push(c(p)),p=0):q++
for(e=k.charCodeAt(0),d=0;8>d;d++)p=p<<1|1&e,q==b-1?(q=0,o.push(c(p)),p=0):q++,e>>=1}else{for(e=1,d=0;n>d;d++)p=p<<1|e,q==b-1?(q=0,o.push(c(p)),p=0):q++,e=0
for(e=k.charCodeAt(0),d=0;16>d;d++)p=p<<1|1&e,q==b-1?(q=0,o.push(c(p)),p=0):q++,e>>=1}l--,0==l&&(l=Math.pow(2,n),n++),delete h[k]}else for(e=g[k],d=0;n>d;d++)p=p<<1|1&e,q==b-1?(q=0,o.push(c(p)),p=0):q++,e>>=1
l--,0==l&&(l=Math.pow(2,n),n++)}for(e=2,d=0;n>d;d++)p=p<<1|1&e,q==b-1?(q=0,o.push(c(p)),p=0):q++,e>>=1
for(;;){if(p<<=1,q==b-1){o.push(c(p))
break}q++}return o.join("")},decompress:function(a){return null==a?"":""==a?null:f._decompress(a.length,32768,function(b){return a.charCodeAt(b)})},_decompress:function(a,c,d){var e,f,g,h,i,j,k,l,m=[],n=4,o=4,p=3,q="",r=[],s={val:d(0),position:c,index:1}
for(f=0;3>f;f+=1)m[f]=f
for(h=0,j=Math.pow(2,2),k=1;k!=j;)i=s.val&s.position,s.position>>=1,0==s.position&&(s.position=c,s.val=d(s.index++)),h|=(i>0?1:0)*k,k<<=1
switch(e=h){case 0:for(h=0,j=Math.pow(2,8),k=1;k!=j;)i=s.val&s.position,s.position>>=1,0==s.position&&(s.position=c,s.val=d(s.index++)),h|=(i>0?1:0)*k,k<<=1
l=b(h)
break
case 1:for(h=0,j=Math.pow(2,16),k=1;k!=j;)i=s.val&s.position,s.position>>=1,0==s.position&&(s.position=c,s.val=d(s.index++)),h|=(i>0?1:0)*k,k<<=1
l=b(h)
break
case 2:return""}for(m[3]=l,g=l,r.push(l);;){if(s.index>a)return""
for(h=0,j=Math.pow(2,p),k=1;k!=j;)i=s.val&s.position,s.position>>=1,0==s.position&&(s.position=c,s.val=d(s.index++)),h|=(i>0?1:0)*k,k<<=1
switch(l=h){case 0:for(h=0,j=Math.pow(2,8),k=1;k!=j;)i=s.val&s.position,s.position>>=1,0==s.position&&(s.position=c,s.val=d(s.index++)),h|=(i>0?1:0)*k,k<<=1
m[o++]=b(h),l=o-1,n--
break
case 1:for(h=0,j=Math.pow(2,16),k=1;k!=j;)i=s.val&s.position,s.position>>=1,0==s.position&&(s.position=c,s.val=d(s.index++)),h|=(i>0?1:0)*k,k<<=1
m[o++]=b(h),l=o-1,n--
break
case 2:return r.join("")}if(0==n&&(n=Math.pow(2,p),p++),m[l])q=m[l]
else{if(l!==o)return null
q=g+g.charAt(0)}r.push(q),m[o++]=g+q.charAt(0),n--,g=q,0==n&&(n=Math.pow(2,p),p++)}}}
return f}(),O.esri.Tiles.saveAs=function(a){"use strict"
var b=a.document,c=function(){return a.URL||a.webkitURL||a},d=a.URL||a.webkitURL||a,e=b.createElementNS("http://www.w3.org/1999/xhtml","a"),f=!a.externalHost&&"download"in e,g=a.webkitRequestFileSystem,h=a.requestFileSystem||g||a.mozRequestFileSystem,i=function(b){(a.setImmediate||a.setTimeout)(function(){throw b},0)},j="application/octet-stream",k=0,l=[],m=function(){for(var a=l.length;a--;){var b=l[a]
"string"==typeof b?d.revokeObjectURL(b):b.remove()}l.length=0},n=function(a,b,c){b=[].concat(b)
for(var d=b.length;d--;){var e=a["on"+b[d]]
if("function"==typeof e)try{e.call(a,c||a)}catch(f){i(f)}}},o=function(d,i){var m,o,p,q=this,r=d.type,s=!1,t=function(){var a=c().createObjectURL(d)
return l.push(a),a},u=function(){n(q,"writestart progress write writeend".split(" "))},v=function(){!s&&m||(m=t(d)),o?o.location.href=m:window.open(m,"_blank"),q.readyState=q.DONE,u()},w=function(a){return function(){return q.readyState!==q.DONE?a.apply(this,arguments):void 0}},x={create:!0,exclusive:!1}
if(q.readyState=q.INIT,i||(i="download"),f){m=t(d),b=a.document,e=b.createElementNS("http://www.w3.org/1999/xhtml","a"),e.href=m,e.download=i
var y=b.createEvent("MouseEvents")
return y.initMouseEvent("click",!0,!1,a,0,0,0,0,0,!1,!1,!1,!1,0,null),e.dispatchEvent(y),q.readyState=q.DONE,void u()}return a.chrome&&r&&r!==j&&(p=d.slice||d.webkitSlice,d=p.call(d,0,d.size,j),s=!0),g&&"download"!==i&&(i+=".download"),(r===j||g)&&(o=a),h?(k+=d.size,void h(a.TEMPORARY,k,w(function(a){a.root.getDirectory("saved",x,w(function(a){var b=function(){a.getFile(i,x,w(function(a){a.createWriter(w(function(b){b.onwriteend=function(b){o.location.href=a.toURL(),l.push(a),q.readyState=q.DONE,n(q,"writeend",b)},b.onerror=function(){var a=b.error
a.code!==a.ABORT_ERR&&v()},"writestart progress write abort".split(" ").forEach(function(a){b["on"+a]=q["on"+a]}),b.write(d),q.abort=function(){b.abort(),q.readyState=q.DONE},q.readyState=q.WRITING}),v)}),v)}
a.getFile(i,{create:!1},w(function(a){a.remove(),b()}),w(function(a){a.code===a.NOT_FOUND_ERR?b():v()}))}),v)}),v)):void v()},p=o.prototype,q=function(a,b){return new o(a,b)}
return p.abort=function(){var a=this
a.readyState=a.DONE,n(a,"abort")},p.readyState=p.INIT=0,p.WRITING=1,p.DONE=2,p.error=p.onwritestart=p.onprogress=p.onwrite=p.onabort=p.onerror=p.onwriteend=null,a.addEventListener("unload",m,!1),q}(this.self||this.window||this.content),O.esri.Tiles.TilesCore=function(){this._getTiles=function(a,b,c,d,e,f,g){e.retrieve(c,function(c,e){a=f("img[src="+d+"]")[0]
var h
return c?(a.style.borderColor="blue",h="data:image/"+b+";base64,"+e.img):g?(a.style.borderColor="green",h="data:image/png;base64,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pmk0TROPj48Hn3l4eIimaSJN06O3A4NJwDMxm82ibdtXo4D5fB6r1Sp+//4dz8/Pw5H+6ekpdrtdJEkS8/n8S/9f713ie3vaceo9x557QAB451Sgfyin34HKshweunk5HzAej2MymXz5+f9nbjJyI9L39Wu5XP55+XQZ39uxR4Z3u90wSXjqEV0wAjhjx47oaZq63Me/ZhIQBAAQAEAAAAEABAAQAEAAAAEABAAQAEAAAAEABAAQAEAAAAEABAAQAEAAAAEABAAQAEAAAAEABAAQAEAAAAEABAAQAEAAAAEABAAQAEAAAAEAAbAJQAAAAQAEABAAQAAAAQAEABAAQAAAAQAEABAAQAAAAQAEABAAQAAAAQAEABAAQAAAAQAEABAAQAAAAQAEABAAQAAAAQAEABAAQAAAAQAEABAAEABAAAABAAQAEABAAAABAAQAEABAAAABAAQAEABAAAABAAQAEABAAAABAAQAEABAAAABAAQAEABAAAABAAQAEABAAAABAAQAEABAAAABAAQAEAAQAEAAAAEABAAQAEAAAAEABAAQAEAAAAEABAAQAEAAAAEAvqe/BwCeKjUweoA8pQAAAABJRU5ErkJggg=="):h="data:image/png;base64,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AwYMGDBgwIABAwYMGDBgwIABAwYMGDBgwIABAwYMGDBgwIABAwYMGDBgwIABAwYMGDBgwIABAwYMGDBgwIABAwYMGDBgwIABAwYMGDBgwIABAwYMGDBgwIABAwYMGDBgwIABAwYMGDBgwIABAwYMGDBgwIABAwYMGDBgwIABAwYMGDBgwIABAwYMGDBgwIABAwYMGDBgwIABAwYMGDBgwIABAwYMGDBgwIABAwYMGDBgwIABAwYMGDBgwIABAwYMGDBgwIABAwYMGDBgwIABAwYMGDBgwIABAwYMGDBgwIABAwYMGDBgwIABAwYMGDBgwIABAwYMGDBgwIABAwYMGDBgwIABAwYMGDBgwIABAwYMGDBgwIABAwYMGDBgwIABAwYMGDBgwIABAwYMGDBgwIABAwYMGDBgwIABAwYMGDBgwIABAwYMGDBgwIABAwYMGDBgwIABAwYMGDBgwIABAwYMGDBgwIABAwYMGDBgwIABAwYMGDBgwIABAwYMGDBgwIABAwYMGDBgwIABAwYMGDBgwIABAwYMGDBgwIABAwYMGDBgwIABAwYMGDBgwIABAwYMGDBgwIABAwYMGDBgwIABAwYMGDBgwIABAwYMGDBgwIABAwYMGDBgwIABAwYMGDBgwIABAwYMGDBgwIABAwYMGDBgwIABAwYMGDBgwIABAwYMGDBgwIABAwYMGDBgwIABAwYMGDBgwIABAwYMGDBgwIABAwYMGDBgwIABAwYMGDBgwIABAwYMGDBgwIABAwYMGDBgwIABAwYMGDBgwIABAwYMGDBgwIABAwYMGDBgwIABAwYMGDBgwIABAwYMGDBgwIABAwYMGDBgwIABAwYMGDBgwIABAwYMGDBgwIABAwYMGDBgwIABAwYMGDBgwIABAwYMGDBgwIABAwYMGDBgwIABAwYMGDBgwIABAwYMGDBgwIABAwYMGDBgwIABAwYMGDBgwIABAwYMGDBgwIABAwYMGDBgwIABAwYMGDBgwIABAwYMGDBgwIABAwYMGDBgwIABAwYMGDDwAwMBPAABGrpAUwAAAABJRU5ErkJggg==",a.style.visibility="visible",a.src=h,""})},this._storeTile=function(a,b,c,d){a=a.split("?")[0]
var e=b?b+"?"+a:a,f=new XMLHttpRequest
f.open("GET",e,!0),f.overrideMimeType("text/plain; charset=x-user-defined"),f.onload=function(){if(200===f.status&&""!==f.responseText){var b=O.esri.Tiles.Base64Utils.wordToBase64(O.esri.Tiles.Base64Utils.stringToWord(this.responseText)),g={url:a,img:b}
c.store(g,d)}else d(!1,f.status+" "+f.statusText+": "+f.response+" when downloading "+e)},f.onerror=function(a){d(!1,a)},f.send(null)},this._createCellsForOffline=function(a,b,c,d,e){for(var f=new O.esri.Tiles.TilingScheme(a),g=[],h=b;c>=h;h++){var i=f.getAllCellIdsInExtent(d,h)
if(i.forEach(function(a){g.push({level:h,row:a[1],col:a[0]})}),g.length>5e3&&h!==c)break}e(g)},this._saveToFile=function(a,b,c){var d=[]
d.push("url,img"),b.getAllTiles(function(b,e,f){if("end"===f){var g=new Blob([d.join("\r\n")],{type:"text/plain;charset=utf-8"}),h=O.esri.Tiles.saveAs(g,a)
if(h.readyState===h.DONE)return h.error?c(!1,"Error saving file "+a):c(!0,"Saved "+(d.length-1)+" tiles ("+Math.floor(g.size/1024/1024*100)/100+" Mb) into "+a)
h.onerror=function(){c(!1,"Error saving file "+a)},h.onwriteend=function(){c(!0,"Saved "+(d.length-1)+" tiles ("+Math.floor(g.size/1024/1024*100)/100+" Mb) into "+a)}}else d.push(b+","+e)})},this._estimateTileSize=function(a,b,c,d,e){if(b){var f
if(""!==d)var g=window.localStorage[d]
if(void 0===g||""===g)f=""
else{var h=JSON.parse(g)
h.credentials.forEach(function(a){-1!==b.indexOf(a.server)&&(f="?token="+a.token)})}var i=c?c+"?"+b+f:b+f
a.get(i,{handleAs:"text/plain; charset=x-user-defined",headers:{"X-Requested-With":""},timeout:2e3}).then(function(a){var b=O.esri.Tiles.Base64Utils.wordToBase64(O.esri.Tiles.Base64Utils.stringToWord(a))
e(b.length+i.length,null)},function(a){e(null,a)})}else e(NaN)},this._loadFromFile=function(a,b,c){if(window.File&&window.FileReader&&window.FileList&&window.Blob){var d=new FileReader
d.onload=function(d){var e,f,g=d.target.result,h=g.split("\r\n"),i=0
if("url,img"!==h[0])return c(!1,"File "+a.name+" doesn't contain tiles that can be loaded")
for(var j=1;j<h.length;j++)e=h[j].split(","),f={url:e[0],img:e[1]},b.store(f,function(b){b&&(i+=1),i===h.length-1&&(window.setTimeout(function(){},1e3),c(!0,i+" tiles loaded from "+a.name))})},d.readAsText(a)}else c(!1,"The File APIs are not fully supported in this browser.")},this._getTilePolygons=function(a,b,c,d){var e,f,g,h,i,j,k=new O.esri.Tiles.TilingScheme(c)
a.getAllTiles(function(a,c,l){a&&0===a.indexOf(b)?(-1!=a.indexOf("_alllayers")?(e=a.split("/"),f=parseInt(e[e.length-2].slice(1),10),g=parseInt(e[e.length-1].substring(1,5),16),h=parseInt(e[e.length-1].substring(6,10),16)):(e=a.split("/"),f=parseInt(e[e.length-3],10),g=parseInt(e[e.length-2],10),h=parseInt(e[e.length-1],10)),i=[h,g],j=k.getCellPolygonFromCellId(i,f),d(j)):a||d(null,l)})},this._parseGetTileInfo=function(a,b){var c=a.replace(/\\'/g,"'"),d=JSON.parse(c)
require(["esri/SpatialReference","esri/layers/LOD","esri/geometry/Extent","esri/layers/TileInfo","esri/geometry/Point"],function(c,e,f,g,h){var i=new c({wkid:d.spatialReference.wkid}),j=[]
JSON.parse(a,function(a,b){if("number"!=typeof a&&a%1!==0||"object"!=typeof b)return b
var c=new e
return c.level=b.level,c.resolution=b.resolution,c.scale=b.scale,b.hasOwnProperty("level")&&j.push(c),b})
var k=new f(parseFloat(d.initialExtent.xmin),parseFloat(d.initialExtent.ymin),parseFloat(d.initialExtent.xmax),parseFloat(d.initialExtent.ymax),i),l=new f(parseFloat(d.fullExtent.xmin),parseFloat(d.fullExtent.ymin),parseFloat(d.fullExtent.xmax),parseFloat(d.fullExtent.ymax),i),m=new g(d.tileInfo),n=new h(m.origin.x,m.origin.y,i)
m.origin=n,m.lods=j,b({initExtent:k,fullExtent:l,tileInfo:m,resultObj:d})})}},O.esri.Tiles.TilesStore=function(){this._db=null,this.dbName="offline_tile_store",this.objectStoreName="tilepath",this.isSupported=function(){return!(!window.indexedDB&&!window.openDatabase)},this.store=function(a,b){try{var c=this._db.transaction([this.objectStoreName],"readwrite")
c.oncomplete=function(){b(!0)},c.onerror=function(a){b(!1,a.target.error.message)}
var d=c.objectStore(this.objectStoreName)
a.url=O.esri.Tiles.LZString.compress(a.url),a.img=O.esri.Tiles.Base64String.compress(a.img)
var e=d.put(a)
e.onsuccess=function(){}}catch(f){b(!1,f.stack)}},this.retrieve=function(a,b){if(null!==this._db){var c=this._db.transaction([this.objectStoreName]).objectStore(this.objectStoreName),d=c.get(O.esri.Tiles.LZString.compress(a))
d.onsuccess=function(a){var c=a.target.result
void 0===c?b(!1,"not found"):(c.url=O.esri.Tiles.LZString.decompress(c.url),c.img=O.esri.Tiles.Base64String.decompress(c.img),b(!0,c))},d.onerror=function(a){b(!1,a)}}},this.deleteAll=function(a){if(null!==this._db){var b=this._db.transaction([this.objectStoreName],"readwrite").objectStore(this.objectStoreName).clear()
b.onsuccess=function(){a(!0)},b.onerror=function(b){a(!1,b)}}else a(!1,null)},this["delete"]=function(a,b){if(null!==this._db){var c=this._db.transaction([this.objectStoreName],"readwrite").objectStore(this.objectStoreName)["delete"](a)
c.onsuccess=function(){b(!0)},c.onerror=function(a){b(!1,a)}}else b(!1,null)},this.getAllTiles=function(a){if(null!==this._db){var b=this._db.transaction([this.objectStoreName]).objectStore(this.objectStoreName).openCursor()
b.onsuccess=function(b){var c=b.target.result
if(c){var d=c.value.url,e=c.value.img
d=O.esri.Tiles.LZString.decompress(d),e=O.esri.Tiles.Base64String.decompress(e),a(d,e,null),c["continue"]()}else a(null,null,"end")}.bind(this),b.onerror=function(b){a(null,null,b)}}else a(null,null,"no db")},this.usedSpace=function(a){if(null!==this._db){var b={sizeBytes:0,tileCount:0},c=this._db.transaction([this.objectStoreName]).objectStore(this.objectStoreName).openCursor()
c.onsuccess=function(c){var d=c.target.result
if(d){var e=d.value,f=JSON.stringify(e)
b.sizeBytes+=this._stringBytes(f),b.tileCount+=1,d["continue"]()}else a(b,null)}.bind(this),c.onerror=function(b){a(null,b)}}else a(null,null)},this._stringBytes=function(a){return a.length},this.init=function(a){var b=indexedDB.open(this.dbName,4)
a=a||function(a){}.bind(this),b.onerror=function(b){a(!1,b.target.errorCode)}.bind(this),b.onupgradeneeded=function(a){var b=a.target.result
b.objectStoreNames.contains(this.objectStoreName)&&b.deleteObjectStore(this.objectStoreName),b.createObjectStore(this.objectStoreName,{keyPath:"url"})}.bind(this),b.onsuccess=function(b){this._db=b.target.result,a(!0)}.bind(this)}},O.esri.Tiles.TilingScheme=function(a){this.tileInfo=a.tileInfo},O.esri.Tiles.TilingScheme.prototype={getCellIdFromXy:function(a,b,c){var d=Math.floor((a-this.tileInfo.origin.x)/(this.tileInfo.cols*this.tileInfo.lods[c].resolution)),e=Math.floor((this.tileInfo.origin.y-b)/(this.tileInfo.rows*this.tileInfo.lods[c].resolution))
return[d,e]},getCellPolygonFromCellId:function(a,b){var c,d=a[0],e=a[1],f=d+1,g=e+1,h=this.tileInfo.origin.x+d*this.tileInfo.cols*this.tileInfo.lods[b].resolution,i=this.tileInfo.origin.y-e*this.tileInfo.rows*this.tileInfo.lods[b].resolution,j=this.tileInfo.origin.x+f*this.tileInfo.cols*this.tileInfo.lods[b].resolution,k=this.tileInfo.origin.y-g*this.tileInfo.rows*this.tileInfo.lods[b].resolution,l=this.tileInfo.spatialReference
return require(["esri/geometry/Polygon"],function(a){c=new a(l)}),c.addRing([[h,i],[j,i],[j,k],[h,k],[h,i]]),c},getAllCellIdsInExtent:function(a,b){var c,d,e=this.getCellIdFromXy(a.xmin,a.ymin,b),f=this.getCellIdFromXy(a.xmax,a.ymax,b),g=Math.max(Math.min(e[0],f[0]),this.tileInfo.lods[b].startTileCol),h=Math.min(Math.max(e[0],f[0]),this.tileInfo.lods[b].endTileCol),i=Math.max(Math.min(e[1],f[1]),this.tileInfo.lods[b].startTileRow),j=Math.min(Math.max(e[1],f[1]),this.tileInfo.lods[b].endTileRow),k=[]
for(c=g;h>=c;c++)for(d=i;j>=d;d++)k.push([c,d])
return k}}
