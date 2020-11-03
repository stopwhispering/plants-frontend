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
		// make libraries available for custom modules and xml view
		formatter: formatter,
		EventsUtil: EventsUtil,
		PropertiesUtil: PropertiesUtil,
		ImageToTaxon: ImageToTaxon,
		Util: Util,
		ModelsHelper: ModelsHelper,
		oModelPlants: null,
		ImageUtil: ImageUtil.getInstance(),
		TraitUtil: TraitUtil.getInstance(),
		TaxonomyUtil: TaxonomyUtil.getInstance(),

		onInit: function () {
			this.oRouter = this.getOwnerComponent().getRouter();
			this.oLayoutModel = this.getOwnerComponent().getModel();
			
			// default: view mode for plants information
			this.getOwnerComponent().getModel('status').setProperty('/details_editable', false);
			
			this.oRouter.getRoute("master").attachPatternMatched(this._onProductMatched, this);
			this.oRouter.getRoute("detail").attachPatternMatched(this._onProductMatched, this);
			this.oRouter.getRoute("untagged").attachPatternMatched(this._onProductMatched, this);
			
			// bind factory function to events list aggregation binding
    		var oEventsList = this.byId("eventsList");
    		oEventsList.bindAggregation("items", 
    			{	path: "events>", 
    				templateShareable: false,
    				factory: this.EventsUtil.eventsListFactory.bind(this),
    				sorter: new Sorter('date', true)  // descending by date
    			});
		},

		filterSubitemsPlants: function(aDictsPlants) {
			return !(aDictsPlants.find(ele=>ele.key == this.sCurrentPlant) == undefined)
		},
		
		onIconPressSetPreview: function(evt){
			
			// get selected image and current plant in model
			var sPathCurrentImage = evt.getSource().getBindingContext("images").getPath();
			var oCurrentImage = this.getOwnerComponent().getModel('images').getProperty(sPathCurrentImage);
			var sPathCurrentPlant = evt.getSource().getBindingContext("plants").getPath();
			var oCurrentPlant = this.getOwnerComponent().getModel('plants').getProperty(sPathCurrentPlant);
			
			
			// temporarily set original image as preview image
			// upon reloading plants model, a specific preview image will be generated 
			var sUrlOriginal = oCurrentImage['url_original'];
			var s = JSON.stringify(sUrlOriginal); // model stores backslash unescaped, so we need a workaround
			var s2 = s.substring(1, s.length-1);
			oCurrentPlant['url_preview'] = s2;
			oCurrentPlant['filename_previewimage'] = s2;
			
			this.getOwnerComponent().getModel('plants').updateBindings();
		},
		
		applyFilterToListImages: function(sPathCurrentPlant){
			// var oListImages = this.getView().byId('listImages');
			var oModelPlants = this.getOwnerComponent().getModel('plants');
			
			//when first opening the site with details open, the plants model
			//may still be loading, so we can't resolve the plant id to a plant name
			//and, hence, can't apply an image filter
			//get the promies of the data loading (triggered from component via ModelsHelper)...
			var oPromise = oModelPlants.dataLoaded();
			
			//...and attach handlers to the promises, executed once data has been loaded
			//note: we can't just use an event handler as the component doesn't know this view at first...
			//(in case of error call the same function where NULL-filter is applied which is better than no filter
			this.sPathCurrentPlant = sPathCurrentPlant;
			oPromise.then(this.applyFilterToListImagesDeferred.bind(this), 
						  this.applyFilterToListImagesDeferred.bind(this));
		},

		applyFilterToListImagesDeferred: function(){
			var oListImages = this.byId('listImages');
			var oModelPlants = this.getOwnerComponent().getModel('plants');
			
			//applying filter to the details view to only display the plant's images
			//deferred as the plants list may not be loaded at the beginning; see promise above
			var oPlant = oModelPlants.getProperty(this.sPathCurrentPlant);
			if (oPlant === undefined){
				this.sCurrentPlant = 'NULL';
			} else {
				this.sCurrentPlant = oPlant.plant_name;
			}
			
			// create custom filter function
			var oFilter = new Filter({
			    path: 'plants',
			    test: this.filterSubitemsPlants.bind(this)
			});
			
			var aFilters = [oFilter];
			var oBinding = oListImages.getBinding("items");
			oBinding.filter(aFilters);
		},
		
		bindModelsForCurrentPlant: function(sPathCurrentPlant){
			//we need to set the taxon deferred as well as we might not have the taxon_id, yet
			//we need to wait for the plants model to be loaded
			//same applies to the events model which requires the plant_name
			var oModelPlants = this.getOwnerComponent().getModel('plants');
			var oPromise = oModelPlants.dataLoaded();
			oPromise.then(this._bindModelsForCurrentPlantDeferred.bind(this, sPathCurrentPlant), 
						  this._bindModelsForCurrentPlantDeferred.bind(this, sPathCurrentPlant));	
		},
		
		_bindModelsForCurrentPlantDeferred: function(sPathCurrentPlant){
			//triggered upon data loading finished of plants model, i.e. we now have the taxon_id and plant_name
			//instead of only the model index (with data not yet loaded)		
			var oModelPlants = this.getOwnerComponent().getModel('plants');
			var oPlant = oModelPlants.getProperty(sPathCurrentPlant);
			
			//bind taxon
			this._bindTaxonOfCurrentPlantDeferred(oPlant);
			
			//bind events&measurements
			//bind current view to that property in events model
			this.getView().bindElement({
				path: "/PlantsEventsDict/" + oPlant.plant_name,
				model: "events"
			});				
			//load only on first load of that plant, otherwise we would overwrite modifications
			//to the plant's events
			var oEventsModel = this.getOwnerComponent().getModel('events');
			if(!oEventsModel.getProperty('/PlantsEventsDict/'+oPlant.plant_name+'/')){
				this._loadEventsForCurrentPlant(oPlant);
			}
			
			// treat properties model in the same way (though it already uses plant id instead of plant name)...
			this.getView().bindElement({
				path: "/propertiesPlants/" + oPlant.id,
				model: "properties"
			});
			var oModelProperties = this.getOwnerComponent().getModel('properties');
			if(!oModelProperties.getProperty('/propertiesPlants/'+oPlant.id+'/')){
				PropertiesUtil.loadPropertiesForCurrentPlant(oPlant, this.getOwnerComponent());
			} 
		},
		
		_loadEventsForCurrentPlant: function(oPlant){
			// request data from backend
			// data is added to local events model and bound to current view upon receivement
			// var sPlantName = encodeURIComponent(oPlant.plant_name);
			// var uri = '/plants_tagger/backend/Event/'+sPlantName;
			var uri = '/plants_tagger/backend/Event/'+oPlant.id;
			$.ajax({
				url: Util.getServiceUrl(uri),
				data: {},
				context: this,
				async: true
			})
			.done(this._onReceivingEventsForPlant.bind(this, oPlant))
			.fail(ModelsHelper.getInstance().onReceiveErrorGeneric.bind(this,'Event (GET)'))
		},

		_onReceivingEventsForPlant: function(oPlant, oData, sStatus, oReturnData){
			//insert (overwrite!) events data for current plant with data received from backend
			var oEventsModel = this.getOwnerComponent().getModel('events');
			oEventsModel.setProperty('/PlantsEventsDict/'+oPlant.plant_name+'/', oData.events);
			
			//for tracking changes, save a clone
			if (!this.getOwnerComponent().oEventsDataClone){
				this.getOwnerComponent().oEventsDataClone = {};
			}
			this.getOwnerComponent().oEventsDataClone[oPlant.plant_name] = Util.getClonedObject(oData.events);
			MessageUtil.getInstance().addMessageFromBackend(oData.message);
		},
		
		_bindTaxonOfCurrentPlantDeferred: function(oPlant){
			// var oModelPlants = this.getOwnerComponent().getModel('plants');
			// var oPlant = oModelPlants.getProperty(sPathCurrentPlant);
			this.getView().bindElement({
				path: "/TaxaDict/" + oPlant.taxon_id,
				model: "taxon"
			});							
		},
		
		handleItemPress: function (oEvent) {
			var oNextUIState = this.getOwnerComponent().getHelper().getNextUIState(2),
				supplierPath = oEvent.getSource().getBindingContext("products").getPath(),
				supplier = supplierPath.split("/").slice(-1).pop();

			this.oRouter.navTo("detailDetail", {layout: oNextUIState.layout, supplier: supplier});
		},
		handleFullScreen: function () {
			var sNextLayout = this.oLayoutModel.getProperty("/actionButtonsInfo/midColumn/fullScreen");
			this.oRouter.navTo("detail", {layout: sNextLayout, product: this._plant});
		},
		handleExitFullScreen: function () {
			var sNextLayout = this.oLayoutModel.getProperty("/actionButtonsInfo/midColumn/exitFullScreen");
			this.oRouter.navTo("detail", {layout: sNextLayout, product: this._plant});
		},
		handleClose: function () {
			var sNextLayout = this.oLayoutModel.getProperty("/actionButtonsInfo/midColumn/closeColumn");
			this.oRouter.navTo("master", {layout: sNextLayout});
		},

		_onProductMatched: function (oEvent) {
			//bind current plant element to view 
			this._plant = oEvent.getParameter("arguments").product || this._plant || "0";

			var sPathCurrentPlant = "/PlantsCollection/" + this._plant;
			this.getView().bindElement({
				path: sPathCurrentPlant,
				model: "plants"
			});
			
			//bind taxon of current plant and events to view (deferred as we may not know the plant name here, yet)
			this.bindModelsForCurrentPlant(sPathCurrentPlant);

			//unbind events data (to avoid events from previous plants being shown)
			this.getView().unbindElement('events');					
			

			//filter images on current plant
			this.applyFilterToListImages(sPathCurrentPlant);
		},
		
		onParentPlantPress: function(sPlant){
			//find parent plant / parent plant pollen in model data array and navigate there
			//triggered by both parent plant and parent plant pollen fields
			var oPlantsModel = this.getOwnerComponent().getModel('plants');
			var iIndex = oPlantsModel.getData().PlantsCollection.findIndex(ele => ele.plant_name === sPlant);
			if (iIndex >= 0){
				Navigation.navToPlantDetails.call(this, iIndex);
			} else {
				this.handleErrorMessageBox("Can't determine Plant Index");
			}
		},

		onPressDescendantPlant: function(evt){
			//find descendant plant in model data array and navigate there
			var oPlantsModel = evt.getSource().getBindingContext('plants').getModel();
			var iDescendantPlantId = evt.getSource().getBindingContext('plants').getObject().id;
			var iIndex = oPlantsModel.getData().PlantsCollection.findIndex(ele => ele.id === iDescendantPlantId);
			if (iIndex >= 0){
				Navigation.navToPlantDetails.call(this, iIndex);
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
			// triggered by onIconPressDeleteImage's confirmation dialogue
			if(sAction !== 'Delete'){
				return;
			}		
			
			Util.startBusyDialog('Deleting', 'Deleting '+sPlant);
			$.ajax({
					  url: Util.getServiceUrl('/plants_tagger/backend/Plant'),
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

			this._applyToFragment('menuDeleteTag', (o)=>{
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
			this.getOwnerComponent().getModel('plants').getData().PlantsCollection[this._plant].tags.splice(iIndex, 1);
			this.getOwnerComponent().getModel('plants').refresh();
		},
		
		onOpenAddTagDialog: function(evt){
			// create add tag dialog
			var oButton = evt.getSource();

			this._applyToFragment('dialogAddTag', _onOpenAddTagDialog.bind(this));
			function _onOpenAddTagDialog(oDialog){
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
				oDialog.openBy(oButton);
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
			var oPlant = this.getOwnerComponent().getModel('plants').getData().PlantsCollection[this._plant]; 
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
			
			this._applyToFragment('dialogRenamePlant',(o)=>{
				this.byId('inputNewPlantName').setValue(this.sCurrentPlant);
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
			this._applyToFragment('dialogRenamePlant',(o)=>o.close());
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
			Util.startBusyDialog("Renaming...", '"'+this.sCurrentPlant+'" to "'+sNewPlantName+'"');
			var dPayload = {'OldPlantName': this.sCurrentPlant,
							'NewPlantName': sNewPlantName};
	    	$.ajax({
				  url: Util.getServiceUrl('/plants_tagger/backend/Plant'),
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
			oModelsHelper.reloadImagesFromBackend();
			oModelsHelper.reloadTaxaFromBackend();	
			
			this._applyToFragment('dialogRenamePlant',(o)=>o.close());
		},
	});
}, true);