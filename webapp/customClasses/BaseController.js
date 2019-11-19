//implements a set of functions that are reused by its subclasses (e.g. back button behaviour)
//abstract controller -> no ".controller." in the filename --> prevents usage in views, too

sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/m/MessageBox",
	"plants/tagger/ui/customClasses/MessageUtil",
	"plants/tagger/ui/customClasses/Util",
	"sap/m/MessageToast",
	"plants/tagger/ui/model/ModelsHelper"
	
], function(Controller, MessageBox, MessageUtil, Util, MessageToast, ModelsHelper) {
	"use strict";
	
	return Controller.extend("plants.tagger.ui.controller.BaseController", {
		
		ModelsHelper: ModelsHelper,
		
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
				if (!Util.dictsAreEqual(dDataPlants['PlantsCollection'][i], 
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
				if (!Util.dictsAreEqual(dDataTaxonOriginal[key], 
										dDataTaxon[key])){
					aModifiedTaxonList.push(dDataTaxon[key]);
				}				
			}, this);
			
			return aModifiedTaxonList;
		},		
		
		getModifiedEvents: function(){
			// returns a dict with events for those plants where at least one event has been modified, added, or deleted
			var oModelEvents = this.getView().getModel('events');
			var dDataEvents = oModelEvents.getData().PlantsEventsDict;
			var dDataEventsOriginal = this.getOwnerComponent().oEventsDataClone;
			
			//get plants for which we have events in the original dataset
			//then, for each of them, check whether events have been changed
			var dModifiedEventsDict = {};
			var keys_clone = Object.keys(dDataEventsOriginal);
			keys_clone.forEach(function(key){
				// if(!Util.arraysAreEqual(dDataEventsOriginal[key],
				if(!Util.objectsEqualManually(dDataEventsOriginal[key],				
										dDataEvents[key])){
											dModifiedEventsDict[key] = dDataEvents[key];
										}
			}, this);
			
			//added plants
			var keys = Object.keys(dDataEvents);
			keys.forEach(function(key){
				if(!dDataEventsOriginal[key]){
					dModifiedEventsDict[key] = dDataEvents[key];
				}
			}, this);

			return dModifiedEventsDict;
		},
		
		getModifiedImages: function(){
			// get images model and identify modified images
			var oModelImages = this.getView().getModel('images');
			var dDataImages = oModelImages.getData();
			var aModifiedImages = [];
			var aOriginalImages = this.getOwnerComponent().oImagesDataClone['ImagesCollection'];
			for (var i = 0; i < dDataImages['ImagesCollection'].length; i++) { 
				if (!Util.dictsAreEqual(dDataImages['ImagesCollection'][i], 
										aOriginalImages[i])){
					aModifiedImages.push(dDataImages['ImagesCollection'][i]);
				}
			}	
			return aModifiedImages;
		},
		
		savePlantsAndImages: function(){
			// saving images, plants, taxa, and events model
			Util.startBusyDialog('Saving...', 'Plants and Images');
			this.savingPlants = false;
			this.savingImages = false;
			this.savingTaxa = false;
			this.savingEvents = false;
			
			var aModifiedPlants = this.getModifiedPlants();
			var aModifiedImages = this.getModifiedImages();
			var aModifiedTaxa = this.getModifiedTaxa();
			var dModifiedEvents = this.getModifiedEvents();
			
			// cancel busydialog if nothing was modified (callbacks not triggered)
			if((aModifiedPlants.length === 0)&&(aModifiedImages.length === 0)&&(aModifiedTaxa.length === 0)&&(Object.keys(dModifiedEvents).length=== 0)){
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
					.fail(ModelsHelper.getInstance().onReceiveErrorGeneric.bind(this,'Plant (POST)'));
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
					.fail(ModelsHelper.getInstance().onReceiveErrorGeneric.bind(this,'Image2 (POST)'));
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
					.fail(ModelsHelper.getInstance().onReceiveErrorGeneric.bind(this,'Taxon (POST)'));
			}
			
			// save events
			if(Object.keys(dModifiedEvents).length > 0){
				this.savingEvents = true;
				var dPayloadEvents = {'ModifiedEventsDict': dModifiedEvents};
		    	$.ajax({
					  url: Util.getServiceUrl('/plants_tagger/backend/Event'),
					  type: 'POST',
					  contentType: "application/json",
					  data: JSON.stringify(dPayloadEvents),
					  context: this
					})
					.done(this.onAjaxSuccessSave)
					.fail(ModelsHelper.getInstance().onReceiveErrorGeneric.bind(this,'Event (POST)'));
			}			
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
		
//		To make it more comfortable, we add a handy shortcut getRouter
		getRouter: function() {
			return sap.ui.core.UIComponent.getRouterFor(this);
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
			} else if (oMsg.resource === 'EventResource'){
				this.savingEvents = false;
				var oModelEvents = this.getView().getModel('events');
				var dDataEvents = oModelEvents.getData();
				this.getOwnerComponent().oEventsDataClone = Util.getClonedObject(dDataEvents.PlantsEventsDict);
				MessageUtil.getInstance().addMessageFromBackend(oMsg.message);
			}

			if(!this.savingPlants&&!this.savingImages&&!this.savingTaxa&&!this.savingEvents){
				Util.stopBusyDialog();
			}
		},

		updateTableHeaderPlantsCount: function(){
			// update count in table header
			var iPlants = this.getView().byId("productsTable").getBinding("items").getLength();
			var sTitle = "Plants (" + iPlants + ")";
			this.getView().byId("pageHeadingTitle").setText(sTitle);
		},
		
		handleErrorMessageBox: function(sText) {
			var bCompact = !!this.getView().$().closest(".sapUiSizeCompact").length;
			MessageBox.error(sText, {
				styleClass: bCompact ? "sapUiSizeCompact" : ""
			});
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
				.fail(ModelsHelper.getInstance().onReceiveErrorGeneric.bind(this,'Image (DELETE)'));
		},
		
		// use a closure to pass an element to the callback function
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