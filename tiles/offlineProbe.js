"use strict";

require([
	"dojo/dom-construct",
	"dojo/dom-class",
	"dojo/_base/window",
	"dojo/domReady!"],
	function(domConstruct,domClass,win)
	{
		var stateNode;

		function updateState()
		{
			console.log('updateState', Offline.state);
			var icon = Offline.state === 'up' ?  "fa-link" : "fa-chain-broken";
			domClass.remove(stateNode, "up down");
			domClass.add(stateNode, Offline.state);
			stateNode.innerHTML = '<i class="fa '+icon+'"></i> ' + Offline.state;
		}

		stateNode = domConstruct.create("div", 
			{
				id: "state", 
				innerHTML: "? unknown"
			}, win.body(), "first");
		console.log(stateNode);

		Offline.options = { checkOnLoad: true, reconnect: true, requests: false };
		Offline.check();
		updateState();

		Offline.on('up down', updateState );
	});