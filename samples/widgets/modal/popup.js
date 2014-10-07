/**
 * Modal Popup Widget
 * This widget provides a basic framework for building modal popups
 * for mobile GIS web applications.
 * @author @agup
 */
define([
    "dojo/_base/declare", "dojo/parser", "dojo/ready",
    "dijit/_WidgetBase", "dijit/_TemplatedMixin","dojo/query",
    "dojo/text!../modal/template/popup.html","dojo/NodeList-manipulate"
], function(declare, parser, ready, _WidgetBase, _TemplatedMixin,query,template){

    return declare("ModalPopup", [_WidgetBase, _TemplatedMixin], {

        options: {
            animation: false,
            animationDuration: 1
        },

        templateString: template,

        constructor: function (options, srcRefNode) {
            // mix in settings and defaults
            declare.safeMixin(this.options, options);

            // widget node
            this.domNode = srcRefNode;

            // Set properties
            this.set("animation", this.options.animation);
            this.set("animationDuration", this.options.animationDuration);
        },

        show: function () {

            if(this.animation){
                // You can design any animation you want!
                this.domNode.style.opacity = 1;
                this.domNode.style.left = 0;
                this.domNode.style.top = 0;
                this.domNode.style.width = "100%";
                this.domNode.style.height = "100%";
                this.domNode.style.transition = "all " + this.animationDuration + "s linear 0s";
            }
            else{
                this.domNode.style.position = "static";
            }
        },

        hide: function () {

            if(this.animation){
                // You can design any animation you want!
                this.domNode.style.height = 0;
                this.domNode.style.width =  0;
                this.domNode.style.opacity = 0;
                this.domNode.style.top = "0px";
                this.domNode.style.left = -1000 + "px";
                this.domNode.style.transition = "all " + this.animationDuration + "s ease-in-out 0s";
            }
            else{
                this.domNode.style.position = "absolute";
            }
        },

        // connections/subscriptions will be cleaned up during the destroy() lifecycle phase
        destroy: function () {
            this.inherited(arguments);
        }
    });
});
