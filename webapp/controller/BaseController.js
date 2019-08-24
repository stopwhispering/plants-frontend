//implements a set of functions that are reused by its subclasses (e.g. back button behaviour)
//abstract controller -> no ".controller." in the filename --> prevents usage in views, too

sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/core/routing/History"
], function(Controller, History) {
	"use strict";
	
	return Controller.extend("plants.tagger.ui.controller.BaseController", {
		
		onInit: function(evt){
			// super.onInit();
			
		},
		
		isEquivalent: function(a, b) {
		    // Create arrays of property names
		    var aProps = Object.getOwnPropertyNames(a);
		    var bProps = Object.getOwnPropertyNames(b);
		
		    // If number of properties is different,
		    // objects are not equivalent
		    if (aProps.length !== bProps.length) {
		        return false;
		    }
		
		    for (var i = 0; i < aProps.length; i++) {
		        var propName = aProps[i];
		
		        // If values of same property are not equal,
		        // objects are not equivalent
		        if (a[propName] !== b[propName]) {
					if (typeof(a[propName]) === 'object' && typeof(b[propName]) === 'object'){
			        	return this.isEquivalent(a[propName], b[propName]);
					} else {         
		            	return false;
					}
		        }
		    }
		
		    // If we made it this far, objects
		    // are considered equivalent
		    return true;
		},
		
		dictsAreEqual: function(a, b){
			return this.isEquivalent(a,b);	
		},
		
		isDictKeyInArray: function(dict, aDicts){
			for (var i = 0; i < aDicts.length; i++) {
				if (aDicts[i].key === dict.key){
					return true;
				}
			}
			return false;
		},
		
//		To make it more comfortable, we add a handy shortcut getRouter
		getRouter: function() {
			return sap.ui.core.UIComponent.getRouterFor(this);
		},
		
//		check if there is a previous hash value in the app history. if so, redirect 
//		to the previous hash via browser's native history api. otherwise navigate to our home view
		onNavBack: function(oEvent){
			var oHistory, sPreviousHash;
			oHistory = History.getInstance();
			sPreviousHash = oHistory.getPreviousHash();
			if (sPreviousHash !== undefined) {
				window.history.go(-1);
			} else {
				this.getRouter().navTo("home", {}, true /*no history*/);
			}
		},
		
		startBusyDialog: function(title, text){
			// console.log("Starting: "+title+" / " + text);
			var busyDialog4 = (sap.ui.getCore().byId("busy4")) ? sap.ui.getCore().byId("busy4") : new sap.m.BusyDialog('busy4',{text:text, title: title});
			busyDialog4.setBusyIndicatorDelay(0);
			busyDialog4.open();
		},
		
		stopBusyDialog: function(){
			var busyDialog4 = sap.ui.getCore().byId("busy4");
			if (busyDialog4){
				busyDialog4.close();
			}
		},
		
		getServiceUrl: function(sUrl){
			if ((window.location.hostname === "localhost") || (window.location.hostname === "127.0.0.1")){
				return "http://localhost:5000"+sUrl;  // no proxy servlet in web ide
			} else {
				return sUrl;
			}
		},
		
		onErrorShowToast: function(oMsg, sStatus, oResponse){
			// shows toasts, triggered upon failed ajax requests
			if (typeof oMsg.responseJSON !== "undefined" && oMsg.responseJSON && oMsg.responseJSON.hasOwnProperty("message")){
					sap.m.MessageToast.show(oMsg.responseJSON["message"]);
			} else {
					sap.m.MessageToast.show(oMsg.responseText);
			}
		},
		
		showSuccessToast: function(sMsg){
			sap.m.MessageToast.show(sMsg);
		},
		
		getDaysFromToday:  function(sDate, strDay2) {
			// input format: yyyy-mm-dd (as string)
			var dDate = Date.parse(sDate);
			var dToday = new Date();
			var iDay = 1000 * 60 * 60 * 24;
			var dDiff = dToday - dDate; 
			return Math.round(dDiff / iDay);
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
		}
	});
});