//implements a set of functions that are reused by its subclasses (e.g. back button behaviour)
//abstract controller -> no ".controller." in the filename --> prevents usage in views, too

sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/core/routing/History",
	"sap/m/MessageBox",
	"plants/tagger/ui/customClasses/MessageUtil",
	"plants/tagger/ui/customClasses/Util",
	"sap/m/MessageToast"
], function(Controller, History, MessageBox, MessageUtil, Util, MessageToast) {
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
		
		getModifiedTaxa: function(){
			// get taxon model and identify modified items
			// difference to plants and images: data is stored with key in a dictionary, not in an array
			// we identify the modified sub-dictionaries and return a list of these
			// note: we don't check whether there's a new taxon as after adding a taxon, it is added
			//	     to the clone as well
			// we don't check for deleted taxa as there's no function for doing this in frontend
			var oModelTaxon = this.getView().getModel('taxon');
			var dDataTaxon = oModelTaxon.getData().TaxaDict;
			var dDataTaxonOriginal = this.getOwnerComponent().oTaxonDataClone['TaxaDict'];
			
			//get taxon id's, i.e. keys of the taxa dict
			var keys = Object.keys(dDataTaxonOriginal);
			
			//for each key, check if it's value is different from the clone
			var aModifiedTaxonList = [];
			keys.forEach(function(key){
				if (!this.dictsAreEqual(dDataTaxonOriginal[key], 
										dDataTaxon[key])){
					aModifiedTaxonList.push(dDataTaxon[key]);
				}				
			}, this);
			
			return aModifiedTaxonList;
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
			Util.startBusyDialog('Saving...', 'Plants and Images');
			this.savingPlants = false;
			this.savingImages = false;
			this.savingTaxa = false;
			
			var aModifiedPlants = this.getModifiedPlants();
			var aModifiedImages = this.getModifiedImages();
			var aModifiedTaxa = this.getModifiedTaxa();
			
			// cancel busydialog if nothing was modified (callbacks not triggered)
			if((aModifiedPlants.length === 0)&&(aModifiedImages.length === 0)&&(aModifiedTaxa.length === 0)){
				MessageToast.show('Nothing to save.');
				Util.stopBusyDialog();
				return;
			}
			
			// save plants
			if(aModifiedPlants.length > 0){
				this.savingPlants = true;  // required in callback function  to find out if both savings are finished
				var dPayloadPlants = {'PlantsCollection': aModifiedPlants};
		    	$.ajax({
					  url: Util.getServiceUrl('/plants_tagger/backend/Plant'),
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
					  url: Util.getServiceUrl('/plants_tagger/backend/Image2'),
					  type: 'POST',
					  contentType: "application/json",
					  data: JSON.stringify(dPayloadImages),
					  context: this
					})
					.done(this.onAjaxSuccessSave)
					.fail(this.onAjaxFailed);
			}
			
			// save taxa
			if(aModifiedTaxa.length > 0){
				this.savingTaxa = true;
				var dPayloadTaxa = {'ModifiedTaxaCollection': aModifiedTaxa};
		    	$.ajax({
					  url: Util.getServiceUrl('/plants_tagger/backend/Taxon'),
					  type: 'POST',
					  contentType: "application/json",
					  data: JSON.stringify(dPayloadTaxa),
					  context: this
					})
					.done(this.onAjaxSuccessSave)
					.fail(this.onAjaxFailed);
			}
		},		
		
		dictsAreEqual: function(a, b){
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
		
//		To make it more comfortable, we add a handy shortcut getRouter
		getRouter: function() {
			return sap.ui.core.UIComponent.getRouterFor(this);
		},

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
		
		onErrorShowToast: function(oMsg, sStatus, oResponse){
			// shows toasts, triggered upon failed ajax requests
			if (typeof oMsg.responseJSON !== "undefined" && oMsg.responseJSON && oMsg.responseJSON.hasOwnProperty("message")){
					MessageToast.show(oMsg.responseJSON["message"]);
			} else {
					MessageToast.show(oMsg.responseText);
			}
		},
		
		showSuccessToast: function(sMsg){
			MessageToast.show(sMsg);
		},
		
		onAjaxSimpleSuccess: function(oMsg, sStatus, oReturnData){
			//toast and create message
			//requires pre-defined message from backend
			MessageToast.show(oMsg.message.message);
			MessageUtil.getInstance().addMessageFromBackend(oMsg.message);
		},

		onAjaxSuccessSave: function(oMsg, sStatus, oReturnData){
			
			// cancel busydialog only if neither saving plants nor images or taxa is still running
			if (oMsg.resource === 'PlantResource'){
				this.savingPlants = false;
				var oModelPlants = this.getView().getModel('plants');
				var dDataPlants = oModelPlants.getData();
				this.getOwnerComponent().oPlantsDataClone = Util.getClonedObject(dDataPlants);
			} else if (oMsg.resource === 'ImageResource'){
				this.savingImages = false;
				var oModelImages = this.getView().getModel('images');
				var dDataImages = oModelImages.getData();
				this.getOwnerComponent().oImagesDataClone = Util.getClonedObject(dDataImages);
			} else if (oMsg.resource === 'TaxonResource'){
				this.savingTaxa = false;
				var oModelTaxon = this.getView().getModel('taxon');
				var dDataTaxon = oModelTaxon.getData();
				this.getOwnerComponent().oTaxonDataClone = Util.getClonedObject(dDataTaxon);
			}

			if(!this.savingPlants&&!this.savingImages&&!this.savingTaxa){
				Util.stopBusyDialog();
			}
		},

		updateTableHeaderPlantsCount: function(){
			// update count in table header
			var iPlants = this.getView().byId("productsTable").getBinding("items").getLength();
			var sTitle = "Plants (" + iPlants + ")";
			this.getView().byId("pageHeadingTitle").setText(sTitle);
		},
		
		onAjaxFailed: function(error){
			//used as callback for ajax errors
			if (error && error.hasOwnProperty('responseJSON') && error.responseJSON && 'error' in error.responseJSON){
				MessageToast.show('Error: ' + error.status + ' ' + error.responseJSON['error']);	
			} else {
				MessageToast.show('Error: ' + error.status + ' ' + error.statusText);
			}	
			Util.stopBusyDialog();
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
		},
		
		onIconPressDeleteImage: function(evt){
			//get image object
			var oPath = evt.getSource().getParent().getBindingContext('images');
			var oImage = oPath.getProperty();			
			
			//confirm dialog
			var bCompact = !!this.getView().$().closest(".sapUiSizeCompact").length;
			MessageBox.confirm(
				"Delete this image?", {
					icon: MessageBox.Icon.WARNING,
					title: "Delete",
					stretch: false,
					onClose: this._confirmDeleteImage.bind(this, oImage, oPath),
					actions: ['Delete', 'Cancel'],
					styleClass: bCompact ? "sapUiSizeCompact" : ""
				}
			);
		},
			
		_confirmDeleteImage: function(oImage, oPath, sAction){
			// triggered by onIconPressDeleteImage's confirmation dialogue
			if(sAction !== 'Delete'){
				return;
			}

			//send delete request
			$.ajax({
				  url: Util.getServiceUrl('/plants_tagger/backend/Image'),
				  type: 'DELETE',
				  contentType: "application/json",
				  data: JSON.stringify(oImage),
				  context: this
				})
				.done(function(data, textStats, jqXHR) {
        			this.onAjaxDeletedImageSuccess(data, textStats, jqXHR, oPath); } 
        			)
				.fail(this.onAjaxFailed);
		},
		
		// use a closure to pass an element to the callback function
		// todo: remove; this is not required, one can just pass an arg today
		onAjaxDeletedImageSuccess: function(data, textStats, jqXHR, oPath){
			//show default success message
			this.onAjaxSimpleSuccess(data, textStats, jqXHR);
			
			//find deleted image in model
			var oImage = oPath.getProperty();
			var aData = this.getView().getModel('images').getData().ImagesCollection;
			//delete image from model data and refresh to make it effective in bindings
			aData.splice(aData.indexOf(oImage), 1);
			this.getView().getModel('images').refresh();
			
			//delete the image from the model clone (used for tracking changes) as well
			var aDataClone = this.getOwnerComponent().oImagesDataClone.ImagesCollection;
			//can't find position with object from above
			var oImageClone = aDataClone.find(function(element){ return element.url_original === oImage.url_original; });
			if(oImageClone !== undefined){
				aDataClone.splice(aDataClone.indexOf(oImageClone), 1);
			}
		}

	});
});