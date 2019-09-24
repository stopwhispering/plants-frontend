//static utility functions

sap.ui.define(["sap/m/BusyDialog"], function(BusyDialog) {
   "use strict";

    return {
    	/*eslint-disable sap-no-hardcoded-url */
    	LOCALHOST_BACKEND: 'http://localhost:5000',  
    	
		parse_resource_from_url: function(sUrl) {
		 var aItems = sUrl.split('/');
		 var iIndex = aItems.indexOf('backend');
		 var aResource = aItems.slice(iIndex+1);
		 return aResource.join('/');
		},
      
		getServiceUrl: function(sUrl){
			if ((window.location.hostname === "localhost") || (window.location.hostname === "127.0.0.1")){
				return this.LOCALHOST_BACKEND+sUrl;  // no proxy servlet in web ide
			} else {
				return sUrl;
			}
		},
		
		getClonedObject: function(oOriginal){
			// create a clone, not a reference
			// there's no better way in js...
			return JSON.parse(JSON.stringify(oOriginal));
		},
		
		startBusyDialog: function(title, text){
			var busyDialog4 = (sap.ui.getCore().byId("busy4")) ? sap.ui.getCore().byId("busy4") : new BusyDialog('busy4',{text:text, title: title});
			busyDialog4.setBusyIndicatorDelay(0);
			busyDialog4.open();
		},
		
		stopBusyDialog: function(){
			var busyDialog4 = sap.ui.getCore().byId("busy4");
			if (busyDialog4){
				busyDialog4.close();
			}
		},
		
		getToday: function(){
			var today = new Date();
			var dd = String(today.getDate()).padStart(2, '0');
			var mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
			var yyyy = today.getFullYear();
			today = yyyy + '-' + mm + '-' + dd;
			return today;
		}
   };
});