//static utility functions

sap.ui.define([
	"sap/m/BusyDialog"
	], function(BusyDialog) {
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
			busyDialog4.setTitle(title);
			busyDialog4.setText(text);
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
		},
		
		formatDate: function(date){
			//var today = new Date();
			var dd = date.getDate();
			var mm = date.getMonth()+1; //January is 0!
			
			var yyyy = date.getFullYear();
			if(dd<10){
			    dd='0'+dd;
			} 
			if(mm<10){
			    mm='0'+mm;
			} 
			var date_str = yyyy+'-'+mm+'-'+dd;
			return date_str;
		},
		
		getDaysFromToday:  function(sDate) {
			// input format: yyyy-mm-dd (as string)
			var dDate = Date.parse(sDate);
			var dToday = new Date();
			var iDay = 1000 * 60 * 60 * 24;
			var dDiff = dToday - dDate; 
			return Math.round(dDiff / iDay);
		},
		
		isObject: function(val) {
		    if (val === null) { return false;}
		    return ( (typeof val === 'function') || (typeof val === 'object') );
		},
		
		objectsEqualManually: function(dict1, dict2){
			var dict1_copy = this.getClonedObject(dict1);
			var dict2_copy = this.getClonedObject(dict2);
			
			// array
			// loop at array objects and check if equal
			if(Array.isArray(dict1_copy) && Array.isArray(dict2_copy)){
				dict1_copy.sort();
				dict2_copy.sort();
				if (dict1_copy.length !== dict2_copy.length){
					return false;
				}
				for (var i = 0; i < dict1_copy.length; i++) {
					if(!this.objectsEqualManually.call(this, dict1_copy[i], dict2_copy[i])){
						return false;
					}
				}
				return true;
			}
			
			// objects
			// easy case: differing properties
			var keys1 = Object.keys(dict1_copy);
			keys1.sort();
			var keys2 = Object.keys(dict2_copy);
			keys2.sort();
			if(JSON.stringify(keys1) !== JSON.stringify(keys2)){
				return false;
			}
			
			// compare object property values
			for (var j = 0; j < keys1.length; j++) {
				var key = keys1[j];
				if(this.isObject(dict1_copy[key]) && this.isObject(dict2_copy[key])){
					if (!this.objectsEqualManually.call(this, dict1_copy[key], dict2_copy[key])){
						return false;
					}
				} else if (this.isObject(dict1_copy[key]) || this.isObject(dict2_copy[key])){
					return false;
				} else {
					// primitives
					if(dict1_copy[key] !== dict2_copy[key]){
						return false;
					}
				}
			}
			return true;
		},
		
		dictsAreEqual: function(dict1, dict2){
			return JSON.stringify(dict1) === JSON.stringify(dict2);	
		},
		
		isDictKeyInArray: function(dict, aDicts){
			var oFound = aDicts.find(function(element){
				return element.key === dict.key;
			});
			if(!!oFound){
				return true;
			} else {
				return false;
			}
		},
		
		arraysAreEqual: function(array1, array2){
			return JSON.stringify(array1) === JSON.stringify(array2);
		},

		// [not currently used in this project]
		openInNewTab: function(sUrl) {
			var win = window.open(sUrl, '_blank');
			win.focus();
		}
			
   };
});