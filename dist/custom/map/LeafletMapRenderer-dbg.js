//the Renderer defines the HTML structure that will be added to the DOM tree
sap.ui.define(['jquery.sap.global'], function(jQuery) {
	"use strict";

	var LeafletMapRenderer = {};

	LeafletMapRenderer.render = function(oRm, oControl) {
		// oRm is the Ui5 Render Manager
		oRm.write('<div ');
		oRm.write('id="map"'); // set it hardcoded
		oRm.writeControlData(oControl);
		oRm.addStyle('height', oControl.getHeight());
		oRm.addStyle('width', oControl.getWidth());
		oRm.writeStyles();
		oRm.write('>');
		oRm.write('</div>');
	};

	return LeafletMapRenderer;
}, true); // notice this: last version i did not export it...