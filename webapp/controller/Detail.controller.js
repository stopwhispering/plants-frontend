sap.ui.define([
	"plants/tagger/ui/controller/BaseController",
	"sap/ui/model/json/JSONModel",
	"sap/ui/core/mvc/Controller",
	'sap/ui/model/Filter',
	'sap/ui/model/FilterOperator',
	'plants/tagger/ui/model/formatter',
	"sap/base/Log"
], function (BaseController, JSONModel, Controller, Filter, FilterOperator, formatter, Log) {
	"use strict";
	
	return BaseController.extend("plants.tagger.ui.controller.Detail", {
		formatter: formatter,
		onInit: function () {
			this.oRouter = this.getOwnerComponent().getRouter();
			this.oModel = this.getOwnerComponent().getModel();

			this.oRouter.getRoute("master").attachPatternMatched(this._onProductMatched, this);
			this.oRouter.getRoute("detail").attachPatternMatched(this._onProductMatched, this);
			// this.oRouter.getRoute("untagged").attachPatternMatched(this._onProductMatched, this);
			
			this._showFormFragment("Display");
			
			// // todo remove
			// this._count = 1;
			// window.setInterval(this.onTodoIntervalRemove, 100);
		},
		
		// onTodoIntervalRemove: function(){
		// 	this._count = this._count + 1;
		// },
		
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
		
		handleSuggestPotMaterial: function(evt){
			// triggered each time user enters something into fragment's pot material input
			var a = 1;
			// var sTerm = evt.getParameter("suggestValue")
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
			var oListImages = this.getView().byId('listImages');
			var oModelPlants = this.getOwnerComponent().getModel('plants');

			var oPlant = oModelPlants.getProperty(sPathCurrentPlant);
			if (oPlant === undefined){
				this.sCurrentPlant = 'NULL';
			} else {
				this.sCurrentPlant = oPlant.plant_name;
			}
			
			// create custom filter function
			// this.sPathCurrentPlant = sPathCurrentPlant;
			var oFilter = new sap.ui.model.Filter({
			    path: 'plants',
			    test: this.filterSubitemsPlants.bind(this)
			});
			
			var aFilters = [oFilter];
			var oBinding = oListImages.getBinding("items");
			oBinding.filter(aFilters);
		},
		
		// onListImagesUpdateStarted: function(evt){
		// 	if (!this.oBindingContext){
		// 		return;
		// 	}
		// 	var sPathCurrentPlant = this.oBindingContext.getPath();
		// 	if (sPathCurrentPlant){
		// 		this.applyFilterToListImages(sPathCurrentPlant);
		// 	}
		// },
		
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
			var sNextLayout = this.oModel.getProperty("/actionButtonsInfo/midColumn/fullScreen");
			this.oRouter.navTo("detail", {layout: sNextLayout, product: this._product});
		},
		handleExitFullScreen: function () {
			var sNextLayout = this.oModel.getProperty("/actionButtonsInfo/midColumn/exitFullScreen");
			this.oRouter.navTo("detail", {layout: sNextLayout, product: this._product});
		},
		handleClose: function () {
			var sNextLayout = this.oModel.getProperty("/actionButtonsInfo/midColumn/closeColumn");
			this.oRouter.navTo("master", {layout: sNextLayout});
		},
		_onProductMatched: function (oEvent) {
			this._product = oEvent.getParameter("arguments").product || this._product || "0";
			this.getView().bindElement({
				path: "/PlantsCollection/" + this._product,
				model: "plants"
			});
			// remember plants sPath, used in images filtering 
			var sPathCurrentPlant = "/PlantsCollection/" + this._product;
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
		
		onMotherPlantPress: function(evt){
			var oPlantsModel = this.getOwnerComponent().getModel('plants');
			var sMotherPlant = evt.getSource().getProperty('title');
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
			// this.getView().byId("buttonSave").setVisible(bEdit);
			this.getView().byId("buttonView").setType(bEdit ? "Transparent" : "Emphasized" );
			this.getView().byId("buttonEdit").setType(bEdit ? "Emphasized" : "Transparent" );
			
			// set the requested form fragment (edit mode or display)
			this._showFormFragment(bEdit ? "Edit" : "Display");
		},
		
		_formFragments: {},
		
		_showFormFragment: function(sFragment){
			var oContainer = this.byId("objPageSubSection");
			oContainer.removeAllBlocks();
			// oContainer.destroyBlocks();
			
			// fragment already created?
			var oFormFragment = this._formFragments[sFragment];
			if (!oFormFragment){
				
				//create fragment
				oFormFragment = sap.ui.xmlfragment(this.getView().getId(), "plants.tagger.ui.view.Detail" + sFragment);
				this._formFragments[sFragment] = oFormFragment;
			}
			
			// insert fragment
			oContainer.addBlock(oFormFragment);
		},
		
		onPressButtonDeletePlant: function(){
			sap.m.MessageToast.show('Function not implemented, yet.');
		},
		
		onPressButtonViewMode: function(evt){
			this._toggleButtons(false);
		},
		
		onPressButtonEditMode: function(evt){
			this._toggleButtons(true);
		},
		
		plantsValidator: function(args){
			//todo: used anywhere?
			var text = args.text;
			return new sap.m.Token({key: text, text: text});
		},
		
		onInputImageNewPlantNameSubmit: function(evt){
			// on enter add new plant to image in model
			var sPlantName = evt.getParameter('value');
			var dictPlant = {key: sPlantName, 
							 text: sPlantName};
			
			
			//check if new
			if(!this.isPlantNameInPlantsModel(sPlantName)){
				sap.m.MessageToast.show('Plant Name does not exist.');
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
					sap.m.MessageToast.show('Plant Name already assigned. ');
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
			var a = 1;
		},
		
		_getDialogAddMeasurement : function() {
			var oView = this.getView();
			var oDialog = oView.byId('dialogMeasurement');
			if(!oDialog){
				oDialog = sap.ui.xmlfragment(oView.getId(), "plants.tagger.ui.view.AddMeasurement", this);
				oView.addDependent(oDialog);
			}
			return oDialog;
            // if (!this.addMeasurementDialog) {
            //     this.addMeasurementDialog = sap.ui.xmlfragment("plants.tagger.ui.view.AddMeasurement", this);
            // }
            // return this.addMeasurementDialog;
        },
        
    	addMeasurement: function(evt){
    		// get new data
       		var oDialog = this._getDialogAddMeasurement();
			var oModel = oDialog.getModel("new");
			var dDataNew = oModel.getData();
			
			if (!dDataNew['measurement_date']){
				sap.m.MessageToast.show('Enter date.');
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
		  			sap.m.MessageToast.show('Duplicate (date already exists for this plant).');
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
			// var oSimpleForm = this.getView().byId('idSimpleForm');
			// oSimpleForm.setModel(oPlantsModel);
			// sap.ui.getCore().byId('idSimpleForm').setModel(oPlantsModel);
		},
		
		onShowUntagged: function(evt){
			var oNextUIState = this.getOwnerComponent().getHelper().getNextUIState(2);
			this.oRouter.navTo("untagged", {layout: oNextUIState.layout, 
											product: this._product});
		}
		

	});
}, true);