sap.ui.define([
	"plants/tagger/ui/customClasses/BaseController",
	"sap/ui/model/json/JSONModel",
	"sap/ui/core/mvc/Controller",
	'sap/ui/model/Filter',
	'sap/ui/model/FilterOperator',
	'plants/tagger/ui/model/formatter',
	"sap/base/Log",
	"sap/m/Token",
	"sap/m/MessageToast",
	"plants/tagger/ui/customClasses/Util"
], function (BaseController, JSONModel, Controller, Filter, FilterOperator, formatter, Log, Token, 
			MessageToast, Util) {
	"use strict";
	
	return BaseController.extend("plants.tagger.ui.controller.Untagged", {
		formatter: formatter,
		onInit: function () {
			this.oRouter = this.getOwnerComponent().getRouter();
			this.oModel = this.getOwnerComponent().getModel();

			this.oRouter.getRoute("master").attachPatternMatched(this._onProductMatched, this);
			this.oRouter.getRoute("detail").attachPatternMatched(this._onProductMatched, this);
			this.oRouter.getRoute("untagged").attachPatternMatched(this._onProductMatched, this);
		},

		oModelPlants: null,
		
		filterSubitemsPlantsUntagged: function(dictsPlants) {
			return (dictsPlants.length === 0) 
		},
		
		onIconPressTagDetailsPlant: function(evt){
			//adds current plant in details view to the image in untagged view
			var aPlantsData = this.getOwnerComponent().getModel('plants').getData().PlantsCollection;
			var sPlantName = aPlantsData[this._plant].plant_name;
			if (sPlantName === ''){ 
				MessageToast('Unknown error');
				return;
			}
			var oBindingContextImage = evt.getSource().getParent().getBindingContext("images");
			this.addPlantNameToImage(sPlantName, oBindingContextImage);
		},
		
		addPlantNameToImage: function(sPlantName, oBindingContextImage){
			//add to model
			var sPath = oBindingContextImage.getPath();
			var oModel = this.getOwnerComponent().getModel('images');
			var aCurrentPlantNames = oModel.getProperty(sPath).plants;
			var dictPlant = {key: sPlantName, 
							 text: sPlantName};
			
			// check if already in list
			if (Util.isDictKeyInArray(dictPlant, aCurrentPlantNames)){
				MessageToast.show('Plant Name already assigned. ');
				return false;
			} else {
				oModel.getProperty(sPath).plants.push(dictPlant);
				Log.info('Assigned plant to image: '+ sPlantName + sPath);
				oModel.updateBindings();
				return true;
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
		
		applyUntaggedFilter: function(){
			var oListImages = this.getView().byId('listImagesUntagged');

			// create custom filter function
			var oFilter = new Filter({
			    path: 'plants',
			    test: this.filterSubitemsPlantsUntagged.bind(this)
			});
			
			var aFilters = [oFilter];
			var oBinding = oListImages.getBinding("items");
			if(!oBinding){
				this._ = 1;  // set breakpoint here for debugging
			} else {
				oBinding.filter(aFilters);
			}
		},

		onAfterRendering: function(evt){
			this.oBindingContext = evt.getSource().getBindingContext("plants");
		},
		
		handleClose: function () {
			var sNextLayout = this.oModel.getProperty("/actionButtonsInfo/endColumn/closeColumn");
			this.oRouter.navTo("detail", {layout: sNextLayout, product: this._plant});
		},
		
		_onProductMatched: function (oEvent) {
			this._plant = oEvent.getParameter("arguments").product || this._plant || "0";
			// only filter if there's currently no filter, i.e. if site
			// is loaded for the first time
			if(this.getView().byId('listImagesUntagged').getBinding('items').aFilters.length === 0){
				this.applyUntaggedFilter();
			}
		},
		
		onInputImageNewPlantNameSubmit: function(evt){
			// on enter add new plant to image in model
			// called by either submitting input or selecting from suggestion table
			if(evt.getId() === 'suggestionItemSelected'){
				var sPlantName = evt.getParameter('selectedRow').getCells()[0].getText();
			} else {
				sPlantName = evt.getParameter('value');  //submit disabled
			}

			//check if new
			if(!this.isPlantNameInPlantsModel(sPlantName)){
				MessageToast.show('Plant Name does not exist.');
				return;
			}
			
			// cancel if emtpy
			if (sPlantName !== ''){ 
				var oBindingContextImage = evt.getSource().getParent().getBindingContext("images");
				this.addPlantNameToImage(sPlantName, oBindingContextImage);
			}
			
			evt.getSource().setValue('');
		},
		
		onPressImagePlantToken: function(evt){
			// get plant name
			var sImagePlantPath = evt.getSource().getBindingContext("images").getPath();
			var sPlant = this.getOwnerComponent().getModel('images').getProperty(sImagePlantPath).key;
			
			// get plant path in plants model
			var oPlantsModel = this.getOwnerComponent().getModel('plants');
			var oData = oPlantsModel.getData();
			// var iIndexPlant = this._getPlantModelIndex(sPlant, oData);
			var iIndexPlant = oData.PlantsCollection.findIndex(ele=>ele.plant_name === sPlant);
			
			if (iIndexPlant >= 0){
			 	//navigate to plant in layout's current column (i.e. middle column)
				var oNextUIState = this.getOwnerComponent().getHelper().getNextUIState(1);
				this.oRouter.navTo("detail", {layout: oNextUIState.layout, product: iIndexPlant});
			 } else {
			 	this.handleErrorMessageBox("Can't find selected Plant");
			 }
		},
		
		getToday: function(){
			var today = new Date();
			var dd = String(today.getDate()).padStart(2, '0');
			var mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
			var yyyy = today.getFullYear();
			today = yyyy + '-' + mm + '-' + dd;
			return today;
		},
		
		onPressReApplyUntaggedFilter: function(){
			this.applyUntaggedFilter();
		}

	});
}, true);