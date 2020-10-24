//implements a set of functions that are reused by its subclasses (e.g. back button behaviour)
//abstract controller -> no ".controller." in the filename --> prevents usage in views, too

sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/m/MessageBox",
	"plants/tagger/ui/customClasses/MessageUtil",
	"plants/tagger/ui/customClasses/Util",
	"sap/m/MessageToast",
	"plants/tagger/ui/model/ModelsHelper",
	"sap/ui/core/Fragment",
	
], function(Controller, MessageBox, MessageUtil, Util, MessageToast, ModelsHelper, Fragment) {
	"use strict";
	
	return Controller.extend("plants.tagger.ui.controller.BaseController", {
		
		ModelsHelper: ModelsHelper,
		
		onInit: function(evt){
			// super.onInit();
		},

		_getFragment: function(sId){
			//returns already-instantiated fragment by sId
			//if not sure wether instantiated, use _applyToFragment
			return this.getView().byId(sId);
		},

		_applyToFragment: function(sId, fn, fnInit){
			//create fragment singleton and apply supplied function to it (e.g. open, close)
			// if stuff needs to be done only once, supply fnInit where first usage happens
			
			//example usages:
			// this._applyToFragment('dialogAddTag', _onOpenAddTagDialog.bind(this));
			// this._applyToFragment('dialogFindSpecies', (o)=>o.close());
			// this._applyToFragment('dialogFindSpecies', (o)=>{doA; doB; doC;}, fnMyInit);
			
			//fragment id to fragment file path
			var sIdToFragment = {
				settingsDialogFilter: 'plants.tagger.ui.view.fragments.master.MasterFilter',
				dialogNewPlant: 'plants.tagger.ui.view.fragments.master.MasterNewPlant',	
				dialogSort: "plants.tagger.ui.view.fragments.master.MasterSort",
				popoverPopupImage: "plants.tagger.ui.view.fragments.master.MasterImagePopover",
				dialogMeasurement: "plants.tagger.ui.view.fragments.AddMeasurement",
				dialogAddTag: "plants.tagger.ui.view.fragments.DetailTagAdd",
				dialogRenamePlant: "plants.tagger.ui.view.fragments.DetailRename",
				eventsForAssignmentList: "plants.tagger.ui.view.fragments.DetailAssignEvent",
				dialogFindSpecies: "plants.tagger.ui.view.fragments.FindSpecies",
				menuDeleteTag: "plants.tagger.ui.view.fragments.DetailTagDelete",
				dialogEditTrait: "plants.tagger.ui.view.fragments.DetailTraitEdit",
				dialogUploadPhotos: "plants.tagger.ui.view.fragments.UploadPhotos",
				MessagePopover: "plants.tagger.ui.view.fragments.MessagePopover",
				menuShellBarMenu: "plants.tagger.ui.view.fragments.ShellBarMenu"
			}

			var oView = this.getView();
			if(oView.byId(sId)){
				fn(oView.byId(sId));
			} else {
				Fragment.load({
					name: sIdToFragment[sId],
					id: oView.getId(),
					controller: this
				}).then(function(oFragment){
					oView.addDependent(oFragment);
					if(fnInit){
						fnInit(oFragment);
					}
					fn(oFragment);	
				});
			}			
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

		_getPropertiesSansTaxa: function(dProperties_){
			var dProperties = Util.getClonedObject(dProperties_);
            for (var i = 0; i < Object.keys(dProperties).length; i++) {
			    var oTaxon = dProperties[Object.keys(dProperties)[i]];
                
                for (var j = 0; j < oTaxon.categories.length; j++) {
                    var oCategory = oTaxon.categories[j];
                     
                    // reverse-loop as we might need to delete a property (name) node within the loop
                    for (var k = oCategory.properties.length - 1; k >= 0; k--) {
                        var oProperty = oCategory.properties[k];

						// remove taxon property value
						var foundTaxonProperty = oProperty.property_values.find(element => element["type"] === "taxon");
                        if(foundTaxonProperty){
                        	var iIndex = oProperty.property_values.indexOf(foundTaxonProperty);
                        	oProperty.property_values.splice(iIndex, 1);
                        }
                        
                        // if there's no plant property value, just remove the whole property name noe
                    	var foundPlantProperty = oProperty.property_values.find(element => element["type"] === "plant");
                    	if(!foundPlantProperty)
                    		oCategory.properties.splice(k, 1);
                    }
                }
			}
			return dProperties;
		},
		
		getModifiedPropertiesPlants: function(){
			// returns a dict with properties for those plants where at least one property has been modified, added, or deleted
			// for these plants, properties are supplied completely; modifications are then identified in backend
			var oModelProperties = this.getView().getModel('properties');
			var dDataProperties = oModelProperties.getData().propertiesPlants;
			// clean up the properties model data (returns a clone, not the original object!)
			dDataProperties = this._getPropertiesSansTaxa(dDataProperties);
			
			var dDataPropertiesOriginal = this.getOwnerComponent().oPropertiesDataClone;
			
			// get plants for which we have properties in the original dataset
			// then, for each of them, check whether properties have been changed
			var dModifiedPropertiesDict = {};
			var keys_clone = Object.keys(dDataPropertiesOriginal);
			keys_clone.forEach(function(key){  
				// loop at plants
				if(!Util.objectsEqualManually(	dDataPropertiesOriginal[key],				
												dDataProperties[key])){
												dModifiedPropertiesDict[key] = dDataProperties[key];
										}
			}, this);
			
			return dModifiedPropertiesDict;
		},
		
		getModifiedPropertiesTaxa: function(){
			var oModelProperties = this.getView().getModel('propertiesTaxa');
			var dpropertiesTaxon = oModelProperties.getData().propertiesTaxon;
			var dPropertiesTaxonOriginal = this.getOwnerComponent().oPropertiesTaxonDataClone;
			if (!dPropertiesTaxonOriginal){
				return {};
			}
			
			// get taxa for which we have properties in the original dataset
			// then, for each of them, check whether properties have been changed
			var dModifiedPropertiesDict = {};
			var keys_clone = Object.keys(dPropertiesTaxonOriginal);
			keys_clone.forEach(function(key){  
				// loop at plants
				if(!Util.objectsEqualManually(	dPropertiesTaxonOriginal[key],				
												dpropertiesTaxon[key])){
												dModifiedPropertiesDict[key] = dpropertiesTaxon[key];
										}
			}, this);
			
			return dModifiedPropertiesDict;			
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
			this.savingProperties = false;
			
			var aModifiedPlants = this.getModifiedPlants();
			var aModifiedImages = this.getModifiedImages();
			var aModifiedTaxa = this.getModifiedTaxa();
			var dModifiedEvents = this.getModifiedEvents();
			var dModifiedPropertiesPlants = this.getModifiedPropertiesPlants();
			var dModifiedPropertiesTaxa = this.getModifiedPropertiesTaxa();

			// cancel busydialog if nothing was modified (callbacks not triggered)
			if((aModifiedPlants.length === 0)&&(aModifiedImages.length === 0)&&(aModifiedTaxa.length === 0)
				&&(Object.keys(dModifiedEvents).length=== 0)&&(Object.keys(dModifiedPropertiesPlants).length=== 0)&&(Object.keys(dModifiedPropertiesTaxa).length===0)){
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
					  url: Util.getServiceUrl('/plants_tagger/backend/Image'),
					  type: 'PUT',
					  contentType: "application/json",
					  data: JSON.stringify(dPayloadImages),
					  context: this
					})
					.done(this.onAjaxSuccessSave)
					.fail(ModelsHelper.getInstance().onReceiveErrorGeneric.bind(this,'Image (PUT)'));
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
			
			// save properties
			if(Object.keys(dModifiedPropertiesPlants).length > 0){
				this.savingProperties = true;
				var dPayloadProperties = {'modifiedPropertiesPlants': dModifiedPropertiesPlants};
		    	$.ajax({
					  url: Util.getServiceUrl('/plants_tagger/backend/Property'),
					  type: 'POST',
					  contentType: "application/json",
					  data: JSON.stringify(dPayloadProperties),
					  context: this
					})
					.done(this.onAjaxSuccessSave)
					.fail(ModelsHelper.getInstance().onReceiveErrorGeneric.bind(this,'Property (POST)'));
			}	
			
			// save properties taxa
			if(Object.keys(dModifiedPropertiesTaxa).length > 0 || Object.keys(dModifiedPropertiesTaxa).length > 0 ){
				this.savingPropertiesTaxa = true;
				var dPayloadPropertiesTaxa = {'modifiedPropertiesTaxa': dModifiedPropertiesTaxa };
		    	$.ajax({
					  url: Util.getServiceUrl('/plants_tagger/backend/PropertyTaxon'),
					  type: 'POST',
					  contentType: "application/json",
					  data: JSON.stringify(dPayloadPropertiesTaxa),
					  context: this
					})
					.done(this.onAjaxSuccessSave)
					.fail(ModelsHelper.getInstance().onReceiveErrorGeneric.bind(this,'Property Taxa (POST)'));
			}		
		},
		
		isPlantNameInPlantsModel: function(sPlantName){
			var aPlants = this.getOwnerComponent().getModel('plants').getProperty('/PlantsCollection');
			return (aPlants.find(ele => ele.plant_name === sPlantName) !== undefined);
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
			} else if (oMsg.resource === 'PropertyResource'){
				this.savingProperties = false;
				var oModelProperties = this.getView().getModel('properties');
				var dDataProperties = oModelProperties.getData();
				var propertiesPlantsWithoutTaxa = this._getPropertiesSansTaxa(dDataProperties.propertiesPlants);
				this.getOwnerComponent().oPropertiesDataClone = Util.getClonedObject(propertiesPlantsWithoutTaxa);
				MessageUtil.getInstance().addMessageFromBackend(oMsg.message);
			} else if (oMsg.resource === 'PropertyTaxaResource'){
				this.savingPropertiesTaxa = false;
				var oModelPropertiesTaxa = this.getView().getModel('propertiesTaxa');
				var dDataPropertiesTaxa = oModelPropertiesTaxa.getData();
				this.getOwnerComponent().oPropertiesTaxonDataClone = Util.getClonedObject(dDataPropertiesTaxa.propertiesTaxon);
				MessageUtil.getInstance().addMessageFromBackend(oMsg.message);
			}

			if(!this.savingPlants&&!this.savingImages&&!this.savingTaxa&&!this.savingEvents&&!this.savingProperties){
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
		},
		
		onInputImageNewKeywordSubmit: function(evt){
			// (used in both details and untagged views)
			// check not empty and new
			var sKeyword = evt.getParameter('value').trim();
			if (!sKeyword){
				evt.getSource().setValue('');
				return;
			}
			
			var aKeywords = evt.getSource().getParent().getBindingContext("images").getObject().keywords;
			if(aKeywords.find(ele=>ele.keyword === sKeyword)){
				MessageToast.show('Keyword already in list');
				evt.getSource().setValue('');
				return;
			}

			//add to current image keywords in images model
			aKeywords.push({keyword: sKeyword});
			evt.getSource().setValue('');
			this.getOwnerComponent().getModel('images').updateBindings();
		},
		
		onTokenizerTokenChange: function(evt){
			// (used in both details and untagged views)
			// triggered upon changes of image's plant assignments and image's keywords
			// note: the token itself has already been deleted; here, we only delete the 
			// 		 corresponding entry from the model
			if(evt.getParameter('type') === 'removed'){
				
				var sKey = evt.getParameter('token').getProperty('key');
				var sType = evt.getSource().data('type'); // plant|keyword
				
				// find plant/keyword in the image's corresponding array and delete
				var oImage = evt.getSource().getParent().getBindingContext("images").getObject();
				var aListDicts = sType === 'plant' ? oImage.plants : oImage.keywords;
				var iIndex = aListDicts.findIndex(ele=>sType==='keyword' ? ele.keyword === sKey : ele.key === sKey);
				if (iIndex === undefined){
					MessageToast.show('Technical error: '+sKey+' not found.');
					return;
				}
				aListDicts.splice(iIndex, 1);
				this.getOwnerComponent().getModel('images').updateBindings();
			}
		}

	});
});