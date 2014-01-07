/**
 * Awesome helper library for serializing and deserializing JavaScript Objects
 * Source is from: https://npmjs.org/package/hydrate
 */
(function(){if(!Array.prototype.indexOf)
{Array.prototype.indexOf=function(elt)
{var len=this.length;var from=Number(arguments[1])||0;from=(from<0)?Math.ceil(from):Math.floor(from);if(from<0)
    from+=len;for(;from<len;from++)
{if(from in this&&this[from]===elt)
    return from;}
    return-1;};}
    if(typeof JSON==="undefined"){var dir="../lib";if(typeof JSON2JSDirectory!=="undefined")dir=JSON2JSDirectory;document.write('\x3Cscript type="text/javascript" src="'+ dir+'/json2.js">\x3C/script>');};var ContextResolver,Hydrate,MultiResolver,Resolver;var __hasProp=Object.prototype.hasOwnProperty,__extends=function(child,parent){for(var key in parent){if(__hasProp.call(parent,key))child[key]=parent[key];}
        function ctor(){this.constructor=child;}
        ctor.prototype=parent.prototype;child.prototype=new ctor;child.__super__=parent.prototype;return child;};Hydrate=(function(){var Util;Util=(function(){function Util(){}
        Util.d2h=function(d){return d.toString(16);};Util.h2d=function(h){return parseInt(h,16);};Util.supportsProto={}.__proto__!=null;Util.supportsFunctionNames=typeof(function(){}).name==="string";Util.functionName=function(func){var _ref;if(Util.supportsFunctionNames){return func.name;}else{return(_ref=func.toString().match(/function ([^(]*)/))!=null?_ref[1]:void 0;}};return Util;})();Hydrate.Util=Util;Hydrate.NonPrototypeFunctionError=(function(){__extends(NonPrototypeFunctionError,Error);function NonPrototypeFunctionError(object,name){this.object=object;this.name=name;this.message="Couldn't serialize object; had non-prototype function '"+ this.name+"'";}
        return NonPrototypeFunctionError;})();Hydrate.PrototypeNotFoundError=(function(){__extends(PrototypeNotFoundError,Error);function PrototypeNotFoundError(object,cons_id){this.object=object;this.cons_id=cons_id;this.message="Prototype not found for object; looked for "+ this.cons_id;}
        return PrototypeNotFoundError;})();Hydrate.AnonymousConstructorError=(function(){__extends(AnonymousConstructorError,Error);function AnonymousConstructorError(object){this.object=object;this.message="Couldn't resolve constructor name; seems it has an anonymous constructor and object's prototype has no #constructor_name property to provide hints";}
        return AnonymousConstructorError;})();Hydrate.VersionInstancePropertyError=(function(){__extends(VersionInstancePropertyError,Error);function VersionInstancePropertyError(object){this.object=object;this.message="Objects can't have versions on the instances; can only be on the prototype";}
        return VersionInstancePropertyError;})();function Hydrate(resolver){this.resolver=resolver!=null?resolver:null;if(!(this.resolver!=null)){this.resolver=new ContextResolver(window);}
        this.errorHandler=function(e){throw e;};this.migrations={};}
        Hydrate.prototype.stringify=function(input){var arr,i,result;this.processed_inputs=[];this.counter=0;result=(function(){var _i,_len;switch(typeof input){case"number":case"string":return JSON.stringify(input);case"function":throw new Error("can't serialize functions");break;default:if(input instanceof Array){arr=[];for(_i=0,_len=input.length;_i<_len;_i++){i=input[_i];arr.push(this.analyze(i));}
            return JSON.stringify(arr);}else{return JSON.stringify(this.analyze(input));}}}).call(this);this.cleanAfterStringify();return result;};Hydrate.prototype.cleanAfterStringify=function(){var input,_i,_len,_ref;_ref=this.processed_inputs;for(_i=0,_len=_ref.length;_i<_len;_i++){input=_ref[_i];if(input){delete input.__hydrate_id;delete input.version;}}
            return true;};Hydrate.prototype.analyze=function(input,name){var cons,i,k,output,v,_len;switch(typeof input){case"number":case"string":return input;case"function":return this.errorHandler(new Hydrate.NonPrototypeFunctionError(input,name));case"undefined":return"__hydrate_undef";default:if(input===null){return null;}else if(input instanceof Array){output=[];for(i=0,_len=input.length;i<_len;i++){v=input[i];output[i]=this.analyze(v,i);}
            return output;}else{if(input.__hydrate_id){return"__hydrate_ref_"+ input.__hydrate_id;}else{input.__hydrate_id=Util.d2h(this.counter++);this.processed_inputs.push(input);output=new Object;for(k in input){v=input[k];if(input.hasOwnProperty(k)){output[k]=this.analyze(v,k);}}
            cons=Util.functionName(input.constructor);if(cons===""&&!input.hasOwnProperty("constructor_name")){cons=input.constructor_name;}
            if(!(cons!=null)){this.errorHandler(AnonymousConstructorError(input));}
            if(cons!=="Object"){output.__hydrate_cons=cons;}
            if(input.hasOwnProperty("version")){this.errorHandler(new Hydrate.VersionInstancePropertyError(input));}
            if(input.version!=null){output.version=input.version;}
            return output;}}}};Hydrate.prototype.setErrorHandler=function(errorHandler){this.errorHandler=errorHandler;};Hydrate._refMatcher=/__hydrate_ref_(.*)/;Hydrate.prototype.parse=function(input){var l,o,obj,obj_key,ref_id,reference,_i,_len,_ref;this.identified_objects=[];this.references_to_resolve=[];o=JSON.parse(input);l=o.length;o=this.fixTree(o);_ref=this.references_to_resolve;for(_i=0,_len=_ref.length;_i<_len;_i++){reference=_ref[_i];obj=reference[0],obj_key=reference[1],ref_id=reference[2];obj[obj_key]=this.identified_objects[ref_id];}
            this.clean(o);return o;};Hydrate.prototype.fixTree=function(obj){var k,k2,m,proto,t,tmp,v,v2,_len;if(obj instanceof Array){for(k=0,_len=obj.length;k<_len;k++){v=obj[k];v=this.fixTree(v);if(typeof v==="string"&&(m=v.match(Hydrate._refMatcher))){k2=Util.h2d(m[1]);this.references_to_resolve.push([obj,k,k2]);}else{obj[k]=v;}}}else if(typeof obj==="object"){if(obj&&(obj.__hydrate_cons!=null)){proto=this.resolvePrototype(obj.__hydrate_cons);if(proto!=null){if(Util.supportsProto){obj.__proto__=proto;}else{tmp=(function(){});tmp.prototype=proto;t=new tmp;for(k in obj){v=obj[k];t[k]=v;}
            obj=t;}}else{this.errorHandler(new Hydrate.PrototypeNotFoundError(obj,obj.__hydrate_cons));}}
            for(k in obj){v=obj[k];v=this.fixTree(v);if(k==="__hydrate_id"){v2=Util.h2d(v);this.identified_objects[v2]=obj;}else if(v==="__hydrate_undef"){obj[k]=void 0;}else if(typeof v==="string"&&(m=v.match(Hydrate._refMatcher))){k2=Util.h2d(m[1]);this.references_to_resolve.push([obj,k,k2]);}else{obj[k]=v;}}}
            return obj;};Hydrate.prototype.resolvePrototype=function(cons_id){if(!(this.resolver!=null)){throw new Error("No Hydrate resolver found -- you should specify one in the Hydrate constructor!");}
            return this.resolver.resolve(cons_id);};Hydrate.prototype.clean=function(o,cleaned){var k,migrations,num,v,_ref,_ref2;if(cleaned==null){cleaned=[];}
            migrations=this.migrations[o.__hydrate_cons];if((o.version!=null)&&(migrations!=null)&&o.version<migrations.length){for(num=_ref=o.version,_ref2=migrations.length- 1;(_ref<=_ref2?num<=_ref2:num>=_ref2);(_ref<=_ref2?num+=1:num-=1)){migrations[num].call(o);}
                delete o.version;}
            cleaned.push(o);if(typeof o==="object"&&!(o instanceof Array)){for(k in o){v=o[k];if(k==="__hydrate_id"||k==="__hydrate_cons"){delete o[k];}else if(typeof v==="object"&&v&&!(o instanceof Array)&&cleaned.indexOf(v)<0){this.clean(v,cleaned);}}}
            return true;};Hydrate.prototype.migration=function(klass,index,callback){var all_versions;switch(typeof klass){case"function":klass=klass.name;if(klass===""){this.errorHandler(new AnonymousConstructorError(klass));}
            break;case"string":null;break;default:throw new Error("invalid class passed in; pass a function or a string");}
            all_versions=this.migrations[klass];if(!(all_versions!=null)){all_versions=this.migrations[klass]=[];}
            all_versions[index- 1]=callback;return true;};return Hydrate;}).call(this);Resolver=(function(){function Resolver(){}
        Resolver.prototype.resolve=function(cons_id){throw new Error("abstract");};return Resolver;})();ContextResolver=(function(){__extends(ContextResolver,Resolver);function ContextResolver(context){this.context=context;}
        ContextResolver.prototype.resolve=function(cons_id){var v;v=this.context[cons_id];if(v!=null){return v.prototype;}else{return null;}};return ContextResolver;})();MultiResolver=(function(){__extends(MultiResolver,Resolver);function MultiResolver(resolvers){this.resolvers=resolvers!=null?resolvers:[];}
        MultiResolver.prototype.resolve=function(cons_id){var proto,res,_i,_len,_ref;_ref=this.resolvers;for(_i=0,_len=_ref.length;_i<_len;_i++){res=_ref[_i];proto=res.resolve(cons_id);if(proto!=null){return proto;}}
            return null;};return MultiResolver;})();Hydrate.Resolver=Resolver;Hydrate.ContextResolver=ContextResolver;Hydrate.MultiResolver=MultiResolver;this.Hydrate=Hydrate;}).call(this);