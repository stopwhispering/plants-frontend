sap.ui.define([
	"plants/tagger/ui/customClasses/BaseController",
	"sap/ui/model/json/JSONModel",
	'sap/ui/model/Filter',
	'plants/tagger/ui/model/formatter',
	'sap/m/MessageBox',
	"sap/m/MessageToast",
	"plants/tagger/ui/customClasses/Util",
	"plants/tagger/ui/customClasses/Navigation",
	"plants/tagger/ui/customClasses/MessageUtil",
	"plants/tagger/ui/model/ModelsHelper",
	"plants/tagger/ui/customClasses/EventsUtil",
	"sap/ui/model/Sorter",
	"sap/ui/model/FilterOperator",
    "plants/tagger/ui/customClasses/ImageToTaxon",
    "plants/tagger/ui/customClasses/PropertiesUtil",
	"plants/tagger/ui/customClasses/ImageUtil",
	"plants/tagger/ui/customClasses/TraitUtil",
	"plants/tagger/ui/customClasses/TaxonomyUtil",
], function (BaseController, JSONModel, Filter, formatter, 
			MessageBox, MessageToast, Util, Navigation, MessageUtil, ModelsHelper, 
			EventsUtil, Sorter, FilterOperator,
			ImageToTaxon, PropertiesUtil, ImageUtil, TraitUtil, TaxonomyUtil) {
	"use strict";
	
	return BaseController.extend("plants.tagger.ui.controller.Detail", {
		// container for xml view control event handlers
		formatter: formatter,
		EventsUtil: EventsUtil,
		PropertiesUtil: PropertiesUtil,
		ImageToTaxon: ImageToTaxon,

		// helper classes for controllers
		// ModelsHelper: ModelsHelper,
		ImageUtil: ImageUtil.getInstance(),
		TraitUtil: TraitUtil.getInstance(),
		TaxonomyUtil: TaxonomyUtil.getInstance(),

		onInit: function () {
			this._oRouter = this.getOwnerComponent().getRouter();
			this.oLayoutModel = this.getOwnerComponent().getModel();
			
			// default: view mode for plants information
			this.getOwnerComponent().getModel('status').setProperty('/details_editable', false);
			
			this._oRouter.getRoute("master").attachPatternMatched(this._onPatternMatched, this);
			this._oRouter.getRoute("detail").attachPatternMatched(this._onPatternMatched, this);
			this._oRouter.getRoute("untagged").attachPatternMatched(this._onPatternMatched, this);
			
			// bind factory function to events list aggregation binding
    		var oEventsList = this.byId("eventsList");
    		oEventsList.bindAggregation("items", 
    			{	path: "events>", 
    				templateShareable: false,
    				factory: this.EventsUtil.eventsListFactory.bind(this),
    				sorter: new Sorter('date', true)  // descending by date
    			});
			
			this._oCurrentPlant = null;
			this._currentPlantId = null;
			this._currentPlantIndex = null;
		},

		_onPatternMatched: function (oEvent) {
			// if accessed directly, we might not have loaded the plants model, yet
			// in that case, we have the plant_id, but not the position of that plant
			// in the plants model index. so we must defer binding that plant to the view

			//bind taxon of current plant and events to view (deferred as we may not know the plant name here, yet)
			this._currentPlantId = parseInt(oEvent.getParameter("arguments").plant_id || this.plant_id || "0");
			this._bindModelsForCurrentPlant();

			//unbind events data (to avoid events from previous plants being shown)
			// this.getView().unbindElement('events');					
		},
		
		_bindModelsForCurrentPlant: function(){
			//we need to set the taxon deferred as well as we might not have the taxon_id, yet
			//we need to wait for the plants model to be loaded
			//same applies to the events model which requires the plant_id
			var oModelPlants = this.getOwnerComponent().getModel('plants');
			var oPromise = oModelPlants.dataLoaded();
			oPromise.then(this._bindPlantsModelDeferred.bind(this), 
						  this._bindPlantsModelDeferred.bind(this));
			
			//loading and binding events requires only the plant id
			this._loadBindEventsModel();

			// if we haven't loaded images for this plant, yet, we do so before generating the images model
			if (!this.getOwnerComponent().imagesPlantsLoaded.has(this._currentPlantId)){
				this.requestImagesForPlant(this._currentPlantId);
			} else {
				this.resetImagesCurrentPlant(this._currentPlantId);
			}
		},

		_loadBindEventsModel: function(){
			//load and bind events
			//bind current view to that property in events model
			this.getView().bindElement({
				path: "/PlantsEventsDict/" + this._currentPlantId,
				model: "events"
			});		

			//load only on first load of that plant, otherwise we would overwrite modifications
			//to the plant's events
			var oEventsModel = this.getOwnerComponent().getModel('events');
			if(!oEventsModel.getProperty('/PlantsEventsDict/'+this._currentPlantId+'/')){
				this._loadEventsForCurrentPlant();
			}
		},
		
		_bindPlantsModelDeferred: function(){
			//triggered upon data loading finished of plants model, i.e. we now have the taxon_id, plant_name,
			// position of plant_id in the plants model array, etc.

			// get current plant's position in plants model array
			var aPlants = this.getOwnerComponent().getModel('plants').getProperty('/PlantsCollection');
			this._currentPlantIndex = aPlants.findIndex(plant=>plant.id === this._currentPlantId);
			if(this._currentPlantIndex === -1){
				MessageToast.show('Plant ID '+ this._currentPlantId +' not found. Redirecting.');
				this._currentPlantIndex = 0;
			}

			// get current plant object in plants model array and bind plant to details view
			var sPathCurrentPlant = "/PlantsCollection/" + this._currentPlantIndex;
			this._oCurrentPlant = this.getOwnerComponent().getModel('plants').getProperty(sPathCurrentPlant);
			this.getView().bindElement({
				path: sPathCurrentPlant,
				model: "plants"
			});
			
			//bind taxon
			this._bindTaxonOfCurrentPlantDeferred(this._oCurrentPlant);
			
			// treat properties model in the same way (it requires the taxon to be known so we have
			// to load it here)
			this._loadBindProperties()

		},

		_loadBindProperties: function(){
			this.getView().bindElement({
				path: "/propertiesPlants/" + this._oCurrentPlant.id,
				model: "properties"
			});
			var oModelProperties = this.getOwnerComponent().getModel('properties');
			if(!oModelProperties.getProperty('/propertiesPlants/'+this._oCurrentPlant.id+'/')){
				PropertiesUtil.loadPropertiesForCurrentPlant(this._oCurrentPlant, this.getOwnerComponent());
			} 			
		},
		
		_loadEventsForCurrentPlant: function(){
			// request data from backend
			// data is added to local events model and bound to current view upon receivement
			var uri = '/plants_tagger/backend/events/'+this._currentPlantId;
			$.ajax({
				url: Util.getServiceUrl(uri),
				data: {},
				context: this,
				async: true
			})
			.done(this._onReceivingEventsForPlant.bind(this, this._currentPlantId))
			.fail(ModelsHelper.getInstance().onReceiveErrorGeneric.bind(this,'Event (GET)'))
		},

		_onReceivingEventsForPlant: function(plantId, oData, sStatus, oReturnData){
			//insert (overwrite!) events data for current plant with data received from backend
			var oEventsModel = this.getOwnerComponent().getModel('events');
			oEventsModel.setProperty('/PlantsEventsDict/'+plantId+'/', oData.events);
			// oEventsModel.setProperty('/PlantsEventsDict/'+this._currentPlantIndex+'/', oData.events);
			
			//for tracking changes, save a clone
			if (!this.getOwnerComponent().oEventsDataClone){
				this.getOwnerComponent().oEventsDataClone = {};
			}
			this.getOwnerComponent().oEventsDataClone[plantId] = Util.getClonedObject(oData.events);
			MessageUtil.getInstance().addMessageFromBackend(oData.message);
		},
		
		_bindTaxonOfCurrentPlantDeferred: function(oPlant){
			this.getView().bindElement({
				path: "/TaxaDict/" + oPlant.taxon_id,
				model: "taxon"
			});							
		},
		
		handleFullScreen: function () {
			var sNextLayout = this.oLayoutModel.getProperty("/actionButtonsInfo/midColumn/fullScreen");
			this._oRouter.navTo("detail", {layout: sNextLayout, plant_id: this._oCurrentPlant.id});
		},
		handleExitFullScreen: function () {
			var sNextLayout = this.oLayoutModel.getProperty("/actionButtonsInfo/midColumn/exitFullScreen");
			this._oRouter.navTo("detail", {layout: sNextLayout, plant_id: this._oCurrentPlant.id});
		},
		handleClose: function () {
			var sNextLayout = this.oLayoutModel.getProperty("/actionButtonsInfo/midColumn/closeColumn");
			this._oRouter.navTo("master", {layout: sNextLayout});
		},

		onChangeActiveSwitch: function(evt){
			if (!evt.getParameter('state')){
				var oSwitch = evt.getSource();
				this.applyToFragment(
					'dialogCancellation',
					(o)=>o.openBy(oSwitch),
					_initCancellationDialog.bind(this));

				function _initCancellationDialog(oDialog){
					// set current date as default
					this.getView().byId("cancellationDate").setDateValue( new Date());

				}
			}
		},
		
		onIconPressSetPreview: function(evt){
			
			// get selected image and current plant in model
			var sPathCurrentImage = evt.getSource().getBindingContext("images").getPath();
			var oCurrentImage = this.getOwnerComponent().getModel('images').getProperty(sPathCurrentImage);
			var sPathCurrentPlant = evt.getSource().getBindingContext("plants").getPath();
			var oCurrentPlant = this.getOwnerComponent().getModel('plants').getProperty(sPathCurrentPlant);
			
			
			// temporarily set original image as preview image
			// upon reloading plants model, a specific preview image will be generated 
			var sUrlOriginal = oCurrentImage['path_original'];
			var s = JSON.stringify(sUrlOriginal); // model stores backslash unescaped, so we need a workaround
			var s2 = s.substring(1, s.length-1);
			oCurrentPlant['url_preview'] = s2;
			oCurrentPlant['filename_previewimage'] = s2;
			
			this.getOwnerComponent().getModel('plants').updateBindings();
		},
		
		onSetInactive: function(evt){
			//we don't use radiobuttongroup helper, so we must get selected element manually
			var aReasons = this.getOwnerComponent().getModel('suggestions').getProperty('/cancellationReasonCollection');
			var oReasonSelected = aReasons.find(ele=>ele.selected);

			//set current plant's cancellation reason and date
			this.getView().getBindingContext('plants').getObject().cancellation_reason = oReasonSelected.text;
			var sDate = Util.formatDate(this.byId("cancellationDate").getDateValue());
			this.getView().getBindingContext('plants').getObject().cancellation_date = sDate;
			this.getOwnerComponent().getModel('plants').updateBindings();

			this.byId('dialogCancellation').close();
		},

		onCloseDialogCancellation: function(){
			this.byId('dialogCancellation').close();
		},

		onChangeParent: function(oEvent){
			// verify entered parent and set parent plant id
			var aPlants = this.getView().getModel('plants').getProperty('/PlantsCollection');
			var parentPlant = aPlants.find(plant=>plant.plant_name === oEvent.getParameter('newValue').trim());
			
			if (!oEvent.getParameter('newValue').trim() || !parentPlant){
				// delete parent plant
				var parentPlantName = undefined;
				var parentPlantId = undefined;
			} else {
				// set parent plant
				parentPlantName = parentPlant.plant_name;
				parentPlantId = parentPlant.id;
			}

			// fn is fired by changes for parent and parent_ollen
			oEvent.getSource().setValue(parentPlantName);
			if (oEvent.getSource().data('parentType') === "parent_pollen"){
				this._oCurrentPlant.parent_plant_pollen = parentPlantName;
				this._oCurrentPlant.parent_plant_pollen_id = parentPlantId;
			} else {
				this._oCurrentPlant.parent_plant = parentPlantName;
				this._oCurrentPlant.parent_plant_id = parentPlantId;
			}
		},
		
		onParentPlantPress: function(parentPlantId){
			//navigate to parent plant
			//triggered by both mother plant and plant donor field
			if (!!parentPlantId){
				Navigation.navToPlantDetails.call(this, parentPlantId);				
			} else {
				this.handleErrorMessageBox("Can't determine Plant Index");
			}
		},

		onPressDescendantPlant: function(evt){
			//find descendant plant in model data array and navigate there
			var oPlantsModel = evt.getSource().getBindingContext('plants').getModel();
			var iDescendantPlantId = evt.getSource().getBindingContext('plants').getObject().id;
			// var iIndex = oPlantsModel.getData().PlantsCollection.findIndex(ele => ele.id === iDescendantPlantId);
			if (iDescendantPlantId >= 0){
				// Navigation.navToPlantDetails.call(this, iIndex);
				Navigation.navToPlantDetails.call(this, iDescendantPlantId);
			} else {
				this.handleErrorMessageBox("Can't determine Plant Index");
			}
		},
		
		onSuggestNursery: function(evt){
			// overwrite default suggestions (only beginsWith term) with custom one (contains term))
		    var aFilters = [];
		    var sTerm = evt.getParameter("suggestValue");
		    if (sTerm) {
		        aFilters.push(new Filter("name", FilterOperator.Contains, sTerm));
		    }
		    evt.getSource().getBinding("suggestionItems").filter(aFilters);
		    //do <<not>> filter the provided suggestions with default logic before showing them to the user
		    evt.getSource().setFilterSuggests(false);			
		},
		
		onPressButtonDeletePlant: function(evt, sPlant){
			if(sPlant.length < 1){
				return;
			}

			//confirm dialog
			var oBindingContextPlants = evt.getSource().getBindingContext('plants');
			var bCompact = !!this.getView().$().closest(".sapUiSizeCompact").length;
			MessageBox.confirm(
				"Delete plant "+sPlant+"?", {
					icon: MessageBox.Icon.WARNING,
					title: "Delete",
					stretch: false,
					onClose: this._confirmDeletePlant.bind(this, sPlant, oBindingContextPlants),
					actions: ['Delete', 'Cancel'],
					styleClass: bCompact ? "sapUiSizeCompact" : ""
				}
			);
		},
			
		_confirmDeletePlant: function(sPlant, oBindingContextPlants, sAction){
			if(sAction !== 'Delete'){
				return;
			}		
			
			Util.startBusyDialog('Deleting', 'Deleting '+sPlant);
			$.ajax({
					  url: Util.getServiceUrl('/plants_tagger/backend/plants/'),
					  type: 'DELETE',
					  contentType: "application/json",
					  data: JSON.stringify({'plant': sPlant}),
					  context: this
					})
					.done(this._onPlantDeleted.bind(this, sPlant, oBindingContextPlants))
					.fail(ModelsHelper.getInstance().onReceiveErrorGeneric.bind(this,'Plant (DELETE)'));
		},
		
		_onPlantDeleted: function(sPlant, oBindingContextPlants, oMsg, sStatus, oReturnData){
				Util.stopBusyDialog();
				this.onAjaxSimpleSuccess(oMsg, sStatus, oReturnData);
				
				//remove from plants model and plants model clone
				//find deleted image in model and remove there
				var aPlantsData = this.getView().getModel('plants').getData().PlantsCollection;
				var oPlant = oBindingContextPlants.getProperty();
				var iPosition = aPlantsData.indexOf(oPlant);
				aPlantsData.splice(iPosition, 1);
				this.getView().getModel('plants').refresh();
				
				//delete from model clone (used for tracking changes) as well
				var aPlantsDataClone = this.getOwnerComponent().oPlantsDataClone.PlantsCollection;
				//can't find position with object from above
				var oPlantClone = aPlantsDataClone.find(function(element){ 
					return element.plant_name === oPlant.plant_name; 
				});
				if(oPlantClone !== undefined){
					aPlantsDataClone.splice(aPlantsDataClone.indexOf(oPlantClone), 1);
				}
				
				//return to one-column-layout (plant in details view was deleted)
				this.handleClose();
		},

		onToggleEditMode: function(evt){
			// toggle edit mode for some of the input controls (actually hide the read-only ones and 
			// unhide the others)
			var sCurrentType = evt.getSource().getType();
			if(sCurrentType === 'Transparent'){
				// set edit mode
				evt.getSource().setType('Emphasized');
				this.getView().getModel('status').setProperty('/details_editable', true);
			} else {
				// set view mode (default)
				evt.getSource().setType('Transparent');
				this.getView().getModel('status').setProperty('/details_editable', false);
			}
		},
		
		onPressTag: function(evt){
			// create delete dialog for tags
			var oTag = evt.getSource();  // for closure
			var sPathTag = oTag.getBindingContext('plants').getPath();

			this.applyToFragment('menuDeleteTag', (o)=>{
				o.bindElement({ path: sPathTag,
								model: "plants" });				
				o.openBy(oTag);
			});
		},
		
		pressDeleteTag: function(evt){
			var oContext = evt.getSource().getBindingContext('plants');
			// get position in tags array
			var sPathItem = oContext.getPath();
			var iIndex = sPathItem.substr(sPathItem.lastIndexOf('/')+1);
			// remove item from array
			// this.getOwnerComponent().getModel('plants').getData().PlantsCollection[this._plant].tags.splice(iIndex, 1);
			this.getOwnerComponent().getModel('plants').getData().PlantsCollection[this._currentPlantIndex].tags.splice(iIndex, 1);
			this.getOwnerComponent().getModel('plants').refresh();
		},
		
		onOpenAddTagDialog: function(evt){
			// create add tag dialog
			var oButton = evt.getSource();

			this.applyToFragment(
				'dialogAddTag',
				(o)=>o.openBy(oButton),
				_initTagDialog.bind(this));
			function _initTagDialog(oDialog){
				var dObjectStatusSelection = {ObjectStatusCollection: [
																	{'selected': false, 'text': 'None', 'state': 'None', 'icon': ''},
																	{'selected': false, 'text': 'Indication01', 'state': 'Indication01', 'icon': ''},
																	{'selected': false, 'text': 'Success', 'state': 'Success', 'icon': ''},
																	{'selected': true, 'text': 'Information', 'state': 'Information', 'icon': ''},
																	{'selected': false, 'text': 'Error', 'state': 'Error', 'icon': ''},
																	{'selected': false, 'text': 'Warning', 'state': 'Warning', 'icon': ''}
																	],
											Value: ''
				};
				var oTagTypesModel = new JSONModel(dObjectStatusSelection);
				oDialog.setModel(oTagTypesModel, 'tagTypes');
			}
		},
		
		onAddTag: function(evt){
			// create a new tag inside the plant's object in the plants model
			// it will be saved in backend when saving the plant
			// new/deleted tags are within scope of the plants model modification tracking
			var dDialogData = this.byId('dialogAddTag').getModel('tagTypes').getData();
			dDialogData.Value = dDialogData.Value.trim();
			
			// check if empty 
			if(dDialogData.Value.length === 0){
				MessageToast.show('Enter text first.');
				return;
			}

			// get selected ObjectStatus template
			var oSelectedElement = dDialogData.ObjectStatusCollection.find(function(element) {
				return element.selected;
			});
			
			// check if same-text tag already exists for plant
			var oPlant = this.getOwnerComponent().getModel('plants').getData().PlantsCollection[this._currentPlantIndex]; 
			if(oPlant.tags){
				var bFound = oPlant.tags.find(function(oTag){
					return oTag.text === dDialogData.Value;	
				});
				if(bFound){
					MessageToast.show('Tag already exists.');
					return;				
				}
			}
			
			// create new token object in plants model
			var dNewTag = {
								// id is determined upon saving to db
								text: dDialogData.Value,
								icon: oSelectedElement.icon,
								state: oSelectedElement.state,
								// last_update is determined upon saving to db
								plant_name: oPlant.plant_name
							};
			if (oPlant.tags){
				oPlant.tags.push(dNewTag);	
			} else {
				oPlant.tags = [dNewTag];
			}
			
			this.getOwnerComponent().getModel('plants').updateBindings();
			this.byId('dialogAddTag').close();
		},
		
		onCloseAddTagDialog: function(evt){
			this.byId('dialogAddTag').close();
		},
		
		onPressButtonRenamePlant: function(evt, sPlant){
			// triggered by button in details upper menu
			// opens messagebox to rename a plant
			if(sPlant.length < 1){
				return;
			}
			
			// check if there are any unsaved changes
			var aModifiedPlants = this.getModifiedPlants();
			var aModifiedImages = this.getModifiedImages();
			var aModifiedTaxa = this.getModifiedTaxa();
			if((aModifiedPlants.length !== 0)||(aModifiedImages.length !== 0)||(aModifiedTaxa.length !== 0)){
				MessageToast.show('There are unsaved changes. Save modified data or reload data first.');
				return;		
			}
			
			this.applyToFragment('dialogRenamePlant',(o)=>{
				this.byId('inputNewPlantName').setValue(this._oCurrentPlant.plant_name);
				o.open();
			});		
		},
		
		onLiveChangeNewPlantName: function(evt){
			var sText = evt.getParameter('value');
			var oButtonSubmit = this.byId('btnRenamePlantSubmit');
			oButtonSubmit.setEnabled(sText.length > 0);			
		},
		
		onPressButtonCancelRenamePlant: function(evt){
			// close rename dialog
			this.applyToFragment('dialogRenamePlant',(o)=>o.close());
		},
		
		onPressButtonSubmitRenamePlant: function(evt){
			// use ajax to rename plant in backend
			var sNewPlantName = this.byId('inputNewPlantName').getValue().trim();
			
			// check if duplicate
			if (sNewPlantName === ''){
				MessageToast.show('Empty not allowed.');
				return;
			}
			
			//check if new
			if(this.isPlantNameInPlantsModel(sNewPlantName)){
				MessageToast.show('Plant Name already exists.');
				return;
			}			

			// ajax call
			Util.startBusyDialog("Renaming...", '"'+this._oCurrentPlant.plant_name+'" to "'+sNewPlantName+'"');
			var dPayload = {'OldPlantName': this._oCurrentPlant.plant_name,
							'NewPlantName': sNewPlantName};
	    	$.ajax({
				  url: Util.getServiceUrl('/plants_tagger/backend/plants/'),
				  type: 'PUT',
				  contentType: "application/json",
				  data: JSON.stringify(dPayload),
				  context: this
				})
				.done(this._onReceivingPlantNameRenamed)
				.fail(ModelsHelper.getInstance().onReceiveErrorGeneric.bind(this,'Plant (PUT)'));			
		},
		
		_onReceivingPlantNameRenamed: function(oMsg, sStatus, oReturnData){
			//plant was renamed in backend
			Util.stopBusyDialog();
			MessageToast.show(oMsg.message.message);
			MessageUtil.getInstance().addMessageFromBackend(oMsg.message);
			
			Util.startBusyDialog('Loading...', 'Loading plants and images data');
			
			var oModelsHelper = ModelsHelper.getInstance();
			oModelsHelper.reloadPlantsFromBackend();
			// oModelsHelper.reloadImagesFromBackend();
			oModelsHelper.resetImagesRegistry();
			//todo trigger reinit of this view (updateBindings/refresh of model doesn't update this view's images)

			this.requestImagesForPlant(this._oCurrentPlant.id);
			
			oModelsHelper.reloadTaxaFromBackend();
			
			this.applyToFragment('dialogRenamePlant',(o)=>o.close());
		},


		requestImagesForPlant: function(plant_id){
			// request data from backend
			var sId = encodeURIComponent(plant_id);
			var uri = '/plants_tagger/backend/plants/'+sId+'/images/';
			
			$.ajax({
				url: Util.getServiceUrl(uri),
				// data: ,
				context: this,
				async: true
			})
			.done(this._onReceivingImagesForPlant.bind(this, plant_id))
			.fail(ModelsHelper.getInstance().onReceiveErrorGeneric.bind(this,'Plant Images (GET)'));	
		},

		_onReceivingImagesForPlant: function(plant_id, oData, sStatus, oReturnData){
			this.addPhotosToRegistry(oData);
			this.getOwnerComponent().imagesPlantsLoaded.add(plant_id);
			this.resetImagesCurrentPlant(plant_id);
			this.getOwnerComponent().getModel('images').updateBindings();

		},

		onUploadPlantPhotosToServer: function(evt){
			//upload images and directly assign them to supplied plant; no keywords included
			var oFileUploader = this.byId("idPlantPhotoUpload");
			if (!oFileUploader.getValue()) {
				// 
				return;
			}

			var sPath = '/plants_tagger/backend/plants/' + this._oCurrentPlant.id + '/images/'
			Util.startBusyDialog('Uploading...', 'Image File(s)');
			var sUrl = Util.getServiceUrl(sPath);
			oFileUploader.setUploadUrl(sUrl);
			// oFileUploader.setAdditionalData(JSON.stringify(dictAdditionalData));

			oFileUploader.upload();
		},

		handleUploadPlantImagesComplete: function(evt){
			// handle message, show error if required
			var oResponse = JSON.parse(evt.getParameter('responseRaw'));
			if(!oResponse){
				sMsg = "Upload complete, but can't determine status.";
				MessageUtil.getInstance().addMessage('Warning', sMsg, undefined, undefined);
			}
			MessageUtil.getInstance().addMessageFromBackend(oResponse.message);
			
			// add to images registry and refresh current plant's images
			if(oResponse.images.length > 0){
				ModelsHelper.getInstance().addToImagesRegistry(oResponse.images);
				this.resetImagesCurrentPlant(this._oCurrentPlant.id);
				this.getOwnerComponent().getModel('images').updateBindings();
			}
			
			Util.stopBusyDialog();
			MessageToast.show(oResponse.message.message);
		}

	});
}, true);