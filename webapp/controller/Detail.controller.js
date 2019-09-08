sap.ui.define([
	"plants/tagger/ui/customClasses/BaseController",
	"sap/ui/model/json/JSONModel",
	'sap/ui/model/Filter',
	'sap/ui/model/FilterOperator',
	'plants/tagger/ui/model/formatter',
	'sap/m/MessageBox',
	"sap/base/Log",
	"sap/m/Token",
	"sap/m/MessageToast",
	"plants/tagger/ui/customClasses/Util"
], function (BaseController, JSONModel, Filter, FilterOperator, formatter, 
			MessageBox, Log, Token, MessageToast, Util) {
	"use strict";
	
	return BaseController.extend("plants.tagger.ui.controller.Detail", {
		formatter: formatter,
		
		onInit: function () {
			this.oRouter = this.getOwnerComponent().getRouter();
			this.oLayoutModel = this.getOwnerComponent().getModel();
			
			// default: view mode for plants information
			var oStatusModel = new JSONModel();
			oStatusModel.setProperty('/details_editable', false);
			this.getView().setModel(oStatusModel, 'status');
			
			// this.oLayoutModel.setProperty('/details_editable', true);

			this.oRouter.getRoute("master").attachPatternMatched(this._onProductMatched, this);
			this.oRouter.getRoute("detail").attachPatternMatched(this._onProductMatched, this);

			this._showFormFragment("Display");
		},
		
		oModelPlants: null,
		
		filterSubitemsPlants: function(dictsPlants) {

			if ((this.sCurrentPlant === '_untagged photos') && (dictsPlants.length === 0)){
				return true;
			}
			if (this.sCurrentPlant === '_all photos'){
				return true;
			}
			if (this.isDictKeyInArray({key: this.sCurrentPlant}, dictsPlants)){
				return true;
			} else {
				return false;
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

		applyFilterToListImagesDeferred: function(sPathCurrentPlant){
			sPathCurrentPlant = this.sPathCurrentPlant; 
			var oListImages = this.getView().byId('listImages');
			var oModelPlants = this.getOwnerComponent().getModel('plants');
			
			//applying filter to the details vier to only display the plant's images
			//deferred as the plants list may not be loaded at the beginning; see promise above
			var oPlant = oModelPlants.getProperty(sPathCurrentPlant);
			if (oPlant === undefined){
				this.sCurrentPlant = 'NULL';
			} else {
				this.sCurrentPlant = oPlant.plant_name;
			}
			
			// create custom filter function
			// this.sPathCurrentPlant = sPathCurrentPlant;
			var oFilter = new Filter({
			    path: 'plants',
			    test: this.filterSubitemsPlants.bind(this)
			});
			
			var aFilters = [oFilter];
			var oBinding = oListImages.getBinding("items");
			oBinding.filter(aFilters);
		},
		
		onAfterRendering: function(evt){
			this.oBindingContext = evt.getSource().getBindingContext("plants");
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
			this.getView().bindElement({
				path: "/PlantsCollection/" + this._plant,
				model: "plants"
			});
			
			//filter images on current plant
			var sPathCurrentPlant = "/PlantsCollection/" + this._plant;
			this.applyFilterToListImages(sPathCurrentPlant);
		},
		
		_getPlantModelIndex: function(sPlant, oData){
			// search for a specific plant in plants model by plant_name 
			// return the index
			for (var i = 0; 1 < oData.PlantsCollection.length; i++) {
			    if(oData.PlantsCollection[i]['plant_name'] === sPlant){
			    	return i;
			    }
			}
		},
		
		onMotherPlantPress: function(sMotherPlant){
			var oPlantsModel = this.getOwnerComponent().getModel('plants');
			//find mother plant in model data array
			var oData = oPlantsModel.getData();
			var sIndexMotherPlant = this._getPlantModelIndex(sMotherPlant, oData);
			if (sIndexMotherPlant){
				//navigate to mother plant in current column
					var oNextUIState = this.getOwnerComponent().getHelper().getNextUIState(1);
					this.oRouter.navTo("detail", {layout: oNextUIState.layout, product: sIndexMotherPlant});
			} else {
				this.handleErrorMessageBox("Can't get Mother Plant Index");
			}
		},
		
		_toggleButtons: function(bEdit){
			// set the requested form fragment (edit mode or display)
			this._showFormFragment(bEdit ? "Edit" : "Display");
		},
		
		_formFragments: {},
		
		_showFormFragment: function(sFragment){
			var oContainer = this.byId("objPageSubSection");
			oContainer.removeAllBlocks();

			// fragment already created?
			var oFormFragment = this._formFragments[sFragment];
			if (!oFormFragment){
				
				//create fragment
				oFormFragment = sap.ui.xmlfragment(this.getView().getId(), "plants.tagger.ui.view.fragments.Detail" + sFragment, this);
				this._formFragments[sFragment] = oFormFragment;
			}
			
			// insert fragment
			oContainer.addBlock(oFormFragment);
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
					.fail(this.onAjaxFailed);	
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
			var sCurrentType = evt.getSource().getType();
			if(sCurrentType === 'Transparent'){
				// set edit mode
				evt.getSource().setType('Emphasized');
				// this._toggleButtons(true);
				this.getView().getModel('status').setProperty('/details_editable', true);
			} else {
				// set view mode (default)
				evt.getSource().setType('Transparent');
				// this._toggleButtons(false);
				this.getView().getModel('status').setProperty('/details_editable', false);
			}
		},
		
		onInputImageNewPlantNameSubmit: function(evt){
			// on enter add new plant to image in model
			var sPlantName = evt.getParameter('value');
			var dictPlant = {key: sPlantName, 
							 text: sPlantName};
			
			
			//check if new
			if(!this.isPlantNameInPlantsModel(sPlantName)){
				MessageToast.show('Plant Name does not exist.');
				return;
			}
			
			// cancel if emtpy
			if (sPlantName !== ''){ 
	
				//add to model
				var sPath = evt.getSource().getParent().getBindingContext("images").getPath();
				var oModel = this.getOwnerComponent().getModel('images');
				// var oModel = evt.getSource().getModel('images');
				var aCurrentPlantNames = oModel.getProperty(sPath).plants;
				
				// check if already in list
				if (this.isDictKeyInArray(dictPlant, aCurrentPlantNames)){
					MessageToast.show('Plant Name already assigned. ');
				} else {
					oModel.getProperty(sPath).plants.push(dictPlant);
					Log.info('Assigned plant to image: '+ sPlantName + sPath);
					oModel.updateBindings();
				}		
			}
			
			evt.getSource().setValue('');
		},
		
		onInputImageNewKeywordSubmit: function(evt){
			var sKeyword = evt.getParameter('value');
			var dictKeyword = {key: sKeyword, 
							   text: sKeyword
			};
			if (!sKeyword){
				return;
			}
			
			//add to model
			var sPath = evt.getSource().getParent().getBindingContext("images").getPath();
			var oModel = this.getOwnerComponent().getModel('images');
			// var oModel = evt.getSource().getModel('images');
			oModel.getProperty(sPath).keywords.push(dictKeyword);
			oModel.updateBindings();
			
			evt.getSource().setValue('');
		},
		
		onTokenizerTokenChange: function(evt){
			if(evt.getParameter('type') === 'removed'){
				
				var sType = evt.getSource().data('type'); // plant|keyword
				
				var dictRecord = {key: evt.getParameter('token').getProperty('key'), 
								  text: evt.getParameter('token').getProperty('text')};
				var sPath = evt.getSource().getParent().getBindingContext("images").getPath();
				var oModel = this.getOwnerComponent().getModel('images');
				var aListDicts = sType === 'plant' ? oModel.getProperty(sPath).plants : oModel.getProperty(sPath).keywords;
				
				// find dict in array
				var index = -1;
				var i;
				for (i = 0; i < aListDicts.length; i++) { 
					if(aListDicts[i].key === dictRecord.key){
						index = i;
						break;
					}
				}
				// delete
				if (index >= 0){
					aListDicts.splice(index, 1);
				}
				oModel.updateBindings();
				
			}
			
		},
		
		onPressImagePlantToken: function(evt){
			// get plant name
			var sImagePlantPath = evt.getSource().getBindingContext("images").getPath();
			var sPlant = this.getOwnerComponent().getModel('images').getProperty(sImagePlantPath).key;
			
			// get plant path in plants model
			var oPlantsModel = this.getOwnerComponent().getModel('plants');
			var oData = oPlantsModel.getData();
			var iIndexPlant = this._getPlantModelIndex(sPlant, oData);
			
			if (iIndexPlant){
			 	//navigate to plant in layout's current column (i.e. middle column)
				var oNextUIState = this.getOwnerComponent().getHelper().getNextUIState(1);
				this.oRouter.navTo("detail", {layout: oNextUIState.layout, product: iIndexPlant});
			 } else {
			 	this.handleErrorMessageBox("Can't find selected Plant");
			 }
		},
		
		handleMeasurementPress: function(evt){
			MessageToast('Nothing happening here, yet');
		},
		
		_getDialogAddMeasurement : function() {
			var oView = this.getView();
			var oDialog = oView.byId('dialogMeasurement');
			if(!oDialog){
				oDialog = sap.ui.xmlfragment(oView.getId(), "plants.tagger.ui.view.fragments.AddMeasurement", this);
				oView.addDependent(oDialog);
			}
			return oDialog;
        },
        
    	addMeasurement: function(evt){
    		// get new data
       		var oDialog = this._getDialogAddMeasurement();
			var oModel = oDialog.getModel("new");
			var dDataNew = oModel.getData();
			
			if (!dDataNew['measurement_date']){
				MessageToast.show('Enter date.');
				return;
			}
			
			// get current measurements in plants model
			var sPath = evt.getSource().getBindingContext("plants").getPath();
			var aMeasurements = this.getView().getModel('plants').getProperty(sPath).measurements;
			if(!aMeasurements){
				this.getView().getModel('plants').getProperty(sPath)['measurements'] = [];
				aMeasurements = this.getView().getModel('plants').getProperty(sPath).measurements;
			}
			
			// make sure it's not a duplicate
			for (var i = 0; i < aMeasurements.length; i++) { 
				if (aMeasurements[i]['measurement_date'] === dDataNew['measurement_date']){
		  			MessageToast.show('Duplicate (date already exists for this plant).');
			  		return;
				}
			}

			aMeasurements.push(dDataNew);
			this.getOwnerComponent().getModel('plants').updateBindings();
			oDialog.close();

        },
        
        closeDialogAddMeasurement: function() {
            this._getDialogAddMeasurement().close();
		},

		getToday: function(){
			var today = new Date();
			var dd = String(today.getDate()).padStart(2, '0');
			var mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
			var yyyy = today.getFullYear();
			today = yyyy + '-' + mm + '-' + dd;
			return today;
		},

		openDialogAddMeasurement: function() {
			var oDialog = this._getDialogAddMeasurement();
			var dNewMeasurement = {'plant_name': this.sCurrentPlant,
								   'measurement_date': this.getToday()
									};
			var oPlantsModel = new JSONModel(dNewMeasurement);
			oDialog.setModel(oPlantsModel, "new");
			this._getDialogAddMeasurement().open();
		}

	});
}, true);