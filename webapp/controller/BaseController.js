//implements a set of functions that are reused by its subclasses (e.g. back button behaviour)
//abstract controller -> no ".controller." in the filename --> prevents usage in views, too

sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/core/routing/History",
	"sap/m/MessageBox"
], function(Controller, History, MessageBox) {
	"use strict";
	
	return Controller.extend("plants.tagger.ui.controller.BaseController", {
		
		onInit: function(evt){
			// super.onInit();
		},
		
		getModifiedPlants: function(){
			// get plants model and identify modified items
			var oModelPlants = this.getView().getModel('plants');
			var dDataPlants = oModelPlants.getData();
			var aModifiedPlants = [];
			var aOriginalPlants = this.getOwnerComponent().oPlantsDataClone['PlantsCollection'];
			for (var i = 0; i < dDataPlants['PlantsCollection'].length; i++) { 
				if (!this.dictsAreEqual(dDataPlants['PlantsCollection'][i], 
										aOriginalPlants[i])){
					aModifiedPlants.push(dDataPlants['PlantsCollection'][i]);
				}
			}
			return aModifiedPlants;
		},
		
		getModifiedImages: function(){
			// get images model and identify modified images
			var oModelImages = this.getView().getModel('images');
			var dDataImages = oModelImages.getData();
			var aModifiedImages = [];
			var aOriginalImages = this.getOwnerComponent().oImagesDataClone['ImagesCollection'];
			for (var i = 0; i < dDataImages['ImagesCollection'].length; i++) { 
				if (!this.dictsAreEqual(dDataImages['ImagesCollection'][i], 
										aOriginalImages[i])){
					aModifiedImages.push(dDataImages['ImagesCollection'][i]);
				}
			}	
			return aModifiedImages;
		},
		
		savePlantsAndImages: function(){
			// saving images and plants model
			this.startBusyDialog('Saving...', 'Plants and Images');
			this.savingPlants = false;
			this.savingImages = false;
			
			var aModifiedPlants = this.getModifiedPlants();
			var aModifiedImages = this.getModifiedImages();
			
			// cancel busydialog if nothing was modified (callbacks not triggered)
			if((aModifiedPlants.length === 0)&&(aModifiedImages.length === 0)){
				sap.m.MessageToast.show('Nothing to save.');
				this.stopBusyDialog();
				return;
			}
			
			// save plants
			if(aModifiedPlants.length > 0){
				this.savingPlants = true;  // required in callback function  to find out if both savings are finished
				var dPayloadPlants = {'PlantsCollection': aModifiedPlants};
		    	$.ajax({
					  url: this.getServiceUrl('/plants_tagger/backend/Plant'),
					  type: 'POST',
					  contentType: "application/json",
					  data: JSON.stringify(dPayloadPlants),
					  context: this
					})
					.done(this.onAjaxSuccessSave)
					.fail(this.onAjaxFailed);
			}

			// save images
			if(aModifiedImages.length > 0){
				this.savingImages = true;
				var dPayloadImages = {'ImagesCollection': aModifiedImages};
		    	$.ajax({
					  url: this.getServiceUrl('/plants_tagger/backend/Image2'),
					  type: 'POST',
					  contentType: "application/json",
					  data: JSON.stringify(dPayloadImages),
					  context: this
					})
					.done(this.onAjaxSuccessSave)
					.fail(this.onAjaxFailed);
			}
		},		
		
		// isEquivalent: function(a, b) {
		// 	//doesn't work for arrays, yet; therefore use json-method, see below
		//   //avoid exceptions in following commands
		//     if ((a===undefined && b!== undefined)||(a!==undefined && b=== undefined)){
		//     	return false;
		//     } else if (a===undefined && b=== undefined){
		//     	return true;
		//     }
		    
		//      // Create arrays of property names
		//     var aProps = Object.getOwnPropertyNames(a);
		//     var bProps = Object.getOwnPropertyNames(b);
		
		//     // If number of properties is different,
		//     // objects are not equivalent
		//     if (aProps.length !== bProps.length) {
		//         return false;
		//     }
		
		//     for (var i = 0; i < aProps.length; i++) {
		//         var propName = aProps[i];
		
		//         // If values of same property are not equal,
		//         // objects are not equivalent
		//         if (a[propName] !== b[propName]) {
		// 			if (typeof(a[propName]) === 'object' && typeof(b[propName]) === 'object'){
		// 	        	return this.isEquivalent(a[propName], b[propName]);
		// 			} else {         
		//             	return false;
		// 			}
		//         }
		//     }
		
		//     // If we made it this far, objects
		//     // are considered equivalent
		//     return true;
		// },
		
		dictsAreEqual: function(a, b){
			// return this.isEquivalent(a,b);	
			return this.dictsAreEqualJson(a,b);	
		},
		
		isPlantNameInPlantsModel: function(sPlantName){
			var aPlants = this.getOwnerComponent().getModel('plants').getData()['PlantsCollection'];
			for (var i = 0; i < aPlants.length; i++) { 
			  if (aPlants[i]['plant_name'] === sPlantName){
			  	return true;
			  }
			}
			return false;
		},
		
		dictsAreEqualJson: function(dict1, dict2){
			return JSON.stringify(dict1) === JSON.stringify(dict2);	
		},
		
		isDictKeyInArray: function(dict, aDicts){
			for (var i = 0; i < aDicts.length; i++) {
				if (aDicts[i].key === dict.key){
					return true;
				}
			}
			return false;
		},
		
		// isDictKeyInArray: function(dictFind, aDicts){
		// // find dict in array
		// 		for (var i = 0; i < aDicts.length; i++) { 
		// 			if(aDicts[i].key === dictFind.key){
		// 				return true;
		// 			}
		// 		}	
		// 		return false;
		// },
		
		// getRegisteredElements: function() {
		//   let core;
		//   const fakePlugin = {
		//     startPlugin: realCore => core = realCore
		//   };
		//   sap.ui.getCore().registerPlugin(fakePlugin);
		//   sap.ui.getCore().unregisterPlugin(fakePlugin);
		//   return core.mElements;
		// },
		
		onAjaxSuccessGeneralHideBusyDialog: function(a, b){
			// todo
			this.stopBusyDialog();
		},
		
		
//		To make it more comfortable, we add a handy shortcut getRouter
		getRouter: function() {
			return sap.ui.core.UIComponent.getRouterFor(this);
		},
		
		// getControlByCustomDataType: function(sType){
		// 	var dictElements = this.getRegisteredElements();
		// 	var aResults = [];
		// 	// loop at elements
		// 	for (const [key, value] of Object.entries(dictElements)) {
		// 		var mydata = value.data('myType');
		// 		if(mydata === sType){
		// 			aResults.push(value);
		// 		}
		// 	}
		// 	return aResults;
			
		// 	// for (i = 0; i < dictElements.length; i++) { 
		// 	//   var mydata = dictElements[i].data();
		// 	//   var a = 1;
		// 	// }
		// },
		
		openInNewTab: function(sUrl) {
			var win = window.open(sUrl, '_blank');
			win.focus();
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
		
		onAjaxSimpleSuccessToast: function(oMsg, sStatus, oReturnData){
			sap.m.MessageToast.show(oMsg.success);
		},

		onAjaxSuccessSave: function(oMsg, sStatus, oReturnData){
			
			// cancel busydialog only neither saving plants nor images is still running
			if (oMsg.resource === 'PlantResource'){
				this.savingPlants = false;
				var oModelPlants = this.getView().getModel('plants');
				var dDataPlants = oModelPlants.getData();
				this.getOwnerComponent().oPlantsDataClone = this.getOwnerComponent().getClonedObject(dDataPlants);
			} else if (oMsg.resource === 'ImageResource'){
				this.savingImages = false;
				var oModelImages = this.getView().getModel('images');
				var dDataImages = oModelImages.getData();
				this.getOwnerComponent().oImagesDataClone = this.getOwnerComponent().getClonedObject(dDataImages);
			}

			if(!this.savingPlants&&!this.savingImages){
				this.stopBusyDialog();
			}
		},

		updateTableHeaderPlantsCount: function(){
			// update count in table header
			var iPlants = this.getView().byId("productsTable").getBinding("items").getLength();
			var sTitle = "Plants (" + iPlants + ")";
			this.getView().byId("pageHeadingTitle").setText(sTitle);
		},
		
		// reloadPlantsFromBackend: function(){
		// 	//reload plants
		// 	$.ajax({
		// 		url: this.getServiceUrl('/plants_tagger/backend/Plant'),
		// 		data: {},
		// 		context: this,
		// 		async: true
		// 	})
		// 	.done(this.onReceivingPlantsFromBackend.bind(this))
		// 	.fail(this.onAjaxFailed.bind(this));			
		// },
		
		// onReceivingPlantsFromBackend: function(data){
		// 	// create new clone objects to track changes
		// 	this.getOwnerComponent().oPlantsDataClone = this.getOwnerComponent().getClonedObject(data);
		// 	this.getView().getModel('plants').setData(data);
			
		// 	// update plants count
		// 	this.updateTableHeaderPlantsCount();
		// },
		
		// reloadImagesFromBackend: function(){
		// 	//reload images data
		// 	$.ajax({
		// 		url: this.getServiceUrl('/plants_tagger/backend/Image2'),
		// 		data: {},
		// 		context: this,
		// 		async: true
		// 	})
		// 	.done(this.onReceivingImagesFromBackend.bind(this))
		// 	.fail(this.onAjaxFailed.bind(this));		
		// },
		
		// onReceivingImagesFromBackend: function(data){
		// 	// create new clone objects to track changes
		// 	this.getOwnerComponent().oImagesDataClone = this.getOwnerComponent().getClonedObject(data);
		// 	this.getView().getModel('images').setData(data);
			
		// 	this.stopBusyDialog();  //todo: only stop when plants are loaded too
		// },
		
		onAjaxFailed: function(error){
			//used as callback for ajax errors
			if (error && error.hasOwnProperty('responseJSON') && error.responseJSON && 'error' in error.responseJSON){
				sap.m.MessageToast.show('Error: ' + error.status + ' ' + error.responseJSON['error']);	
			} else {
				sap.m.MessageToast.show('Error: ' + error.status + ' ' + error.statusText);
			}	
			this.stopBusyDialog();
		},
		
		handleErrorMessageBox: function(sText) {
			var bCompact = !!this.getView().$().closest(".sapUiSizeCompact").length;
			MessageBox.error(sText, {
				styleClass: bCompact ? "sapUiSizeCompact" : ""
			});
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