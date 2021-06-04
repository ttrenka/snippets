dependencies ={
	layers: [
		{
			name: "dojo.js",
			dependencies: [
				"dair.AIR",
				"dair.fx",
				"dair.Icon",
				"dair.Window",

				"dijit.form.Form",
				"dijit.layout.BorderContainer",
				"dijit.layout.ContentPane",
				"dijit.layout.StackContainer",

				"dojo.behavior",
				"dojo.date.locale",
				"dojo.DeferredList",
				"dojo.dnd.Source",
				"dojo.fx",
				"dojo.fx.easing",

				"dojox.dtl.Context",
				"dojox.dtl.filter.lists",
				"dojox.dtl.html",
				"dojox.dtl.tag.logic",
				"dojox.dtl.tag.misc",
				"dojox.encoding.digests.SHA1",
				"dojox.fx._base",
				"dojox.io.OAuth",
				"dojox.widget.Dialog"
			]
		},
		{
			name: "qd.js",
			dependencies: [
				"qd.services",
				"qd.services.authorization",
				"qd.services.data",
				"qd.services.feeds",
				"qd.services.network",
				"qd.services.offline",
				"qd.services.offline.feeds",
				"qd.services.offline.queues",
				"qd.services.offline.titles",
				"qd.services.offline.user",
				"qd.services.online",
				"qd.services.online.feeds",
				"qd.services.online.queues",
				"qd.services.online.titles",
				"qd.services.online.user",
				"qd.services.parser",
				"qd.services.storage",
				"qd.services.util",

				"qd.app",
				"qd.app.feeds",
				"qd.app.movies",
				"qd.app.preferences",
				"qd.app.queue",
				"qd.app.queueList",
				"qd.app.ratings",
				"qd.app.recommendations",
				"qd.app.resultsList",
				"qd.app.search",
				"qd.app.systray",
				"qd.app.tooltip",
				"qd.app.topMovies",
				"qd.app.sync",
				"qd.init"
			]
		},
	],
	prefixes: [
		[ "dijit", "../dijit" ],
		[ "dojox", "../dojox" ],
		[ "dair", "../dair" ],
		[ "qd", "../qd" ]
	]
};


