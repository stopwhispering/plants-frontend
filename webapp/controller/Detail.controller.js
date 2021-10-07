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
			
			// this._oRouter.getRoute("master").attachPatternMatched(this._onPatternMatched, this);
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

			Util.startBusyDialog();

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
		
		onPressGoToPlant: function(parentPlantId){
			//navigate to supplied plant
			if (!!parentPlantId){
				Navigation.navToPlantDetails.call(this, parentPlantId);				
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

		onPressButtonClonePlant: function(oEvent){
			// triggered by button in details upper menu
			// opens dialog to clone current plant
			
			// check if there are any unsaved changes
			var aModifiedPlants = this.getModifiedPlants();
			var aModifiedImages = this.getModifiedImages();
			var aModifiedTaxa = this.getModifiedTaxa();
			if((aModifiedPlants.length !== 0)||(aModifiedImages.length !== 0)||(aModifiedTaxa.length !== 0)){
				MessageToast.show('There are unsaved changes. Save modified data or reload data first.');
				return;		
			}
			
			this.applyToFragment('dialogClonePlant',(o)=>{
				var clonePlantName = this._generatePlantNameWithRomanizedSuffix(this._oCurrentPlant.plant_name, 2);
				this.byId('inputClonedPlantName').setValue(clonePlantName);
				o.open();
			});		
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
		
		onPressButtonRenamePlant: function(oEvent){
			// triggered by button in details upper menu
			// opens dialog to rename current plant
			
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

		onLiveChangeNewPlantName: function(evt, type){
			// called from either rename or clone fragment
			var sText = evt.getParameter('value');
			if (type === 'clone'){
				this.byId('btnClonePlantSubmit').setEnabled(sText.length > 0);		
			} else if (type === 'rename'){
				this.byId('btnRenamePlantSubmit').setEnabled(sText.length > 0);		
			} else if (type === 'descendant'){
				this.byId('btnDescendantDialogCreate').setEnabled(sText.length > 0);		
			}
		},

		onPressButtonSubmitClonePlant: function(oEvent){
			// use ajax to clone plant in backend
			var sClonedPlantName = this.byId('inputClonedPlantName').getValue().trim();
			
			// check if duplicate
			if (sClonedPlantName === ''){
				MessageToast.show('Empty not allowed.');
				return;
			}
			
			//check if new
			if(this.isPlantNameInPlantsModel(sClonedPlantName)){
				MessageToast.show('Plant Name already exists.');
				return;
			}			

			// ajax call
			Util.startBusyDialog("Cloning...", '"'+this._oCurrentPlant.plant_name+'" to "'+sClonedPlantName+'"');
			// var dPayload = {'plant_name_clone': sClonedPlantName};  //todo fastapi somehow has problems with body payload
	    	$.ajax({
				  url: Util.getServiceUrl('/plants_tagger/backend/plants/'+this._oCurrentPlant.id+'/clone?plant_name_clone='+sClonedPlantName),
				  type: 'POST',
				  contentType: "application/json",
				//   data: JSON.stringify(dPayload),
				  context: this
				})
				.done(this._onReceivingPlantCloned)
				.fail(ModelsHelper.getInstance().onReceiveErrorGeneric.bind(this,'Clone Plant (POST)'));		
		},

		_onReceivingPlantCloned: function(oMsg, sStatus, oReturnData){
					// Cloning plant was successful; add clone to model and open in details view
					this.applyToFragment('dialogClonePlant',(o)=>o.close());
					MessageUtil.getInstance().addMessageFromBackend(oMsg.message);

					var oPlantSaved = oMsg.plants[0];
					var aPlants = this.getOwnerComponent().getModel('plants').getProperty('/PlantsCollection');
					aPlants.push(oPlantSaved);  // append at end to preserve change tracking with clone 
					this.getOwnerComponent().getModel('plants').updateBindings();

					// ...and add to cloned plants to allow change tracking
					var oPlantClone = Util.getClonedObject(oPlantSaved);
					this.getOwnerComponent().oPlantsDataClone.PlantsCollection.push(oPlantClone);
					MessageToast.show(oMsg.message.message);

					// finally navigate to the newly created plant in details view
					Navigation.navToPlantDetails.call(this, oPlantSaved.id);
					Util.stopBusyDialog();
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
		},

		onPressButtonCreateDescendantPlant: function(evt){
			// triggered by button in details upper menu
			// opens dialog to create descendant plant with current plant as mother plant
			
			// check if there are any unsaved changes
			var aModifiedPlants = this.getModifiedPlants();
			var aModifiedImages = this.getModifiedImages();
			var aModifiedTaxa = this.getModifiedTaxa();
			if((aModifiedPlants.length !== 0)||(aModifiedImages.length !== 0)||(aModifiedTaxa.length !== 0)){
				MessageToast.show('There are unsaved changes. Save modified data or reload data first.');
				return;		
			}
			
			this.applyToFragment('dialogCreateDescendant',(o)=>{
				// create json model descendant and set it (default settings are when opening)
				var defaultPropagationType = 'seed (collected)';
				var descendantPlantDataInit = {
					"propagationType": defaultPropagationType,
					"parentPlant": this.getPlantById(this._currentPlantId).plant_name,
					"parentPlantPollen": undefined,
					"descendantPlantName": undefined
				};
				var modelDescendant = new JSONModel(descendantPlantDataInit);
				o.setModel(modelDescendant, "descendant");
				this.updatePlantNameSuggestion();
				o.open();
			}
			);
		},

		onDescendantDialogCreate: function(evt){
			// triggered from create-descendant-dialog to create the descendant plant
			//todo validate if existing
			var descendantPlantData = this.byId('dialogCreateDescendant').getModel('descendant').getData();

			if (!descendantPlantData.propagationType || !descendantPlantData.propagationType.length){
				MessageToast.show('Choose propagation type.');
				return;
			}

			// validate parent plant (obligatory and valid) and parent plant pollen (valid if supplied)
			if (!descendantPlantData.parentPlant || !this.isPlantNameInPlantsModel(descendantPlantData.parentPlant)){
				MessageToast.show('Check parent plant.');
				return;
			}

			var propagationType = this.getSuggestionItem('propagationTypeCollection', descendantPlantData.propagationType);
			if (propagationType.hasParentPlantPollen === true &&
				!!descendantPlantData.parentPlantPollen && 
				!this.isPlantNameInPlantsModel(descendantPlantData.parentPlantPollen)){
					MessageToast.show('Check parent plant pollen.');
					return;
			};

			// validate new plant name
			if (!descendantPlantData.descendantPlantName || !descendantPlantData.descendantPlantName.trim().length){
				MessageToast.show('Enter new plant name.');
				return;
			};

			if (this.isPlantNameInPlantsModel(descendantPlantData.descendantPlantName)){
				MessageToast.show('Plant with that name already exists.');
				return;
			};

			// assemble new plant and save it
			var parentPlant = this.getPlantByName(descendantPlantData.parentPlant);
			var newPlant = {
				'plant_name': descendantPlantData.descendantPlantName,
				'propagation_type': descendantPlantData.propagationType,
				'taxon_id': propagationType.hasParentPlantPollen ? undefined : parentPlant.taxon_id,
				'field_number': propagationType.hasParentPlantPollen ? '-' : parentPlant.field_number,
				'geographic_origin': propagationType.hasParentPlantPollen ? '-' : parentPlant.geographic_origin,
				'nursery_source': '-',
				'parent_plant': parentPlant.plant_name,
				'parent_plant_id': parentPlant.id,
				'active': true };
			if (!!descendantPlantData.parentPlantPollen && descendantPlantData.parentPlantPollen.length){
				newPlant.parent_plant_pollen = descendantPlantData.parentPlantPollen;
				newPlant.parent_plant_pollen_id = this.getPlantId(descendantPlantData.parentPlantPollen);
			}
			this.saveNewPlant(newPlant);

			this.applyToFragment('dialogCreateDescendant',(o)=>o.close());
		},

		_generatePlantNameWithRomanizedSuffix: function(baseName, beginWith){
			// e.g. Aeonium spec. II -> Aeonium spec. III if the former already exists
			for (var i = beginWith; i < 100; i++) {
				var latinNumber = Util.romanize(i);
				var suggestedName = baseName + ' ' + latinNumber;
				if (!this.isPlantNameInPlantsModel(suggestedName)){
					return suggestedName;
				}
			}
		},

		_generateNewPlantNameSuggestion: function(parentPlantName, parentPlantPollenName=undefined, hasParentPlantPollen){
			// generate new plant name suggestion
			// ... only if parent plant names are set
			if (!parentPlantName || !parentPlantName.trim().length){
				return;
			}
			var parentPlant = this.getPlantByName(parentPlantName);
			
			var includeParentPlantPollen = (hasParentPlantPollen === true &&
				parentPlantPollenName && parentPlantPollenName.trim().length);
			
			if(hasParentPlantPollen === true && !includeParentPlantPollen){
				return undefined;
			}

			// hybrid of two parents
			if (includeParentPlantPollen){
				var parentPlantPollen = this.getPlantByName(parentPlantPollenName);
				var suggestedName = ( parentPlant.botanical_name || parentPlantName ) + ' × ' + 
					( parentPlantPollen.botanical_name || parentPlantPollenName );
				if(this.isPlantNameInPlantsModel(suggestedName)){
					// we need to find a variant using latin numbers, starting with II
					// Consider existing latin number at ending
					suggestedName = this._generatePlantNameWithRomanizedSuffix(suggestedName, 2);
				}

				// Just one parent: add latin number to parent plant name
				// Consider existing latin number at ending
			} else {
				var baseName = parentPlantName;
				var reRomanNumber = /\sM{0,4}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$/;
				var romanNumberMatch = baseName.match(reRomanNumber);
				if (!!romanNumberMatch){
					var romanNumber = romanNumberMatch.pop();
					var beginWith = Util.arabize(romanNumber) + 1;
					// remove the roman number at the end
					baseName = baseName.substr(0, parentPlantName.lastIndexOf(' ')); 
				} else {
					var beginWith = 2;
				}
				
				// find suitable roman number suffix
				var suggestedName = this._generatePlantNameWithRomanizedSuffix(baseName, beginWith);
			}

			return suggestedName;
		},

		updatePlantNameSuggestion: function(){
			// generate new plant name suggestion
			if (!this.byId('autoNameDescendantPlantName').getSelected()){
				return;
			}

			var descendantPlantData = this.byId('dialogCreateDescendant').getModel('descendant').getData();
			if(descendantPlantData.propagationType && descendantPlantData.propagationType.length){
				var propagationType = this.getSuggestionItem('propagationTypeCollection', descendantPlantData.propagationType);
			}
			var suggestedName = this._generateNewPlantNameSuggestion(descendantPlantData.parentPlant, 
																	descendantPlantData.parentPlantPollen, 
																	propagationType.hasParentPlantPollen);
			this.byId('dialogCreateDescendant').getModel('descendant').setProperty('/descendantPlantName', suggestedName);
		},

		onDescendantDialogChangeParent: function(event, parentType){
			// reset parent plant (/pollen) input if entered plant name is invalid
			var parentPlantName = event.getParameter('newValue').trim();

			if (!parentPlantName || !this.isPlantNameInPlantsModel(parentPlantName)){
				event.getSource().setValue(undefined);
				return;
			}

			this.updatePlantNameSuggestion();
		},

		onDescendantDialogSwitchParents: function(){
			// triggered by switch button; switch parent plant and parent plant pollen
			var model = this.byId('dialogCreateDescendant').getModel('descendant');
			var parentPlantName = model.getProperty('/parentPlant');
			model.setProperty('/parentPlant', model.getProperty('/parentPlantPollen'));
			model.setProperty('/parentPlantPollen', parentPlantName);

			this.updatePlantNameSuggestion();
		}

	});
}, true);