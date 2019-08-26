sap.ui.define([
	"sap/ui/core/UIComponent",
	"sap/ui/Device",
	"plants/tagger/ui/model/models",
	"sap/ui/model/json/JSONModel",
	"sap/f/FlexibleColumnLayoutSemanticHelper",
	"plants/tagger/ui/model/ModelsHelper"
], function(UIComponent, Device, models, JSONModel, FlexibleColumnLayoutSemanticHelper, ModelsHelper) {
	"use strict";

	return UIComponent.extend("plants.tagger.ui.Component", {

		metadata: {
			manifest: "json"
		},

		/**
		 * The component is initialized by UI5 automatically during the startup of the app and calls the init method once.
		 * @public
		 * @override
		 */
		init: function() {
			// call the base component's init function
			UIComponent.prototype.init.apply(this, arguments);

			// set the device model
			this.setModel(models.createDeviceModel(), "device");
			
			
			// instantiate empty models and name them
			//they are filled in the helper class
			var oPlantsModel = new JSONModel();
			oPlantsModel.setSizeLimit(1000);
			this.setModel(oPlantsModel, 'plants');
			var oImagesModel = new JSONModel();
			oImagesModel.setSizeLimit(1000);
			this.setModel(oImagesModel, 'images');
			
			//use helper class to load data into json models
			//(helper class is used to reload data via button as well)
			var oModelsHelper = new ModelsHelper(this);
			oModelsHelper.reloadPlantsFromBackend();
			oModelsHelper.reloadImagesFromBackend();
			

			// force sync (otherwise problems with image filtering)
			var oModel = new JSONModel();
			this.setModel(oModel);

			// set products demo model on this sample
			// var oProductsModel = new JSONModel(jQuery.sap.getModulePath("sap.ui.demo.mock", "/products.json"));
			// oProductsModel.setSizeLimit(1000);
			// this.setModel(oProductsModel, "products");
			
			
			
// 			this.getPlantsData();
// 			var oPlantsModel = new JSONModel(this.oPlantsData);
// 			// var oPlantsModel = new JSONModel('http://127.0.0.1:5000/plants_tagger/backend/Plant');
// 			oPlantsModel.setSizeLimit(1000);
// 			this.setModel(oPlantsModel, 'plants');

// 			//var oImagesModel = new JSONModel('http://127.0.0.1:5000/plants_tagger/backend/Image2');
// 			var oImagesModel = new JSONModel(this.getServiceUrl('/plants_tagger/backend/Image2'));
// 			oImagesModel.setSizeLimit(1000);
// 			this.setModel(oImagesModel, 'images');

// //			compare upon saving to enable tacking changes
// //			attach callback to save a clone (in order to track changes)	
// 			oImagesModel.attachRequestCompleted(function(data){
// 						this.oImagesDataClone = this.getClonedObject(data.getSource().getData());
// 					}.bind(this));			
// 			this.oPlantsDataClone = this.getClonedObject(this.oPlantsData);  
			
			this.getRouter().initialize();
		},
		
		getClonedObject: function(oOriginal){
			// create a clone, not a reference
			// there's no better way in js...
			return JSON.parse(JSON.stringify(oOriginal));
		},
		
		getServiceUrl: function(sUrl){
			if ((window.location.hostname === "localhost") || (window.location.hostname === "127.0.0.1")){
				return "http://localhost:5000"+sUrl;  // no proxy servlet in web ide
			} else {
				return sUrl;
			}
		},

		getPlantsData: function(){
			$.ajax({
				url: this.getServiceUrl('/plants_tagger/backend/Plant'),
				data: {},
				context: this,
				async: false
			}).done(function(data) {
				this.oPlantsData = data;
			}).fail(function(error){
				if (error && error.hasOwnProperty('responseJSON') && error.responseJSON && 'error' in error.responseJSON){
					sap.m.MessageToast.show('Canceling failed: ' + error.status + ' ' + error.responseJSON['error']);	
				} else {
					sap.m.MessageToast.show('Canceling failed: ' + error.status + ' ' + error.statusText);
				}						
			});
			
		},
		
		createContent: function () {
			return sap.ui.view({
				viewName: "plants.tagger.ui.view.FlexibleColumnLayout",
				type: "XML"
			});
		},
		
		
		
				/**
		 * Returns an instance of the semantic helper
		 * @returns {sap.f.FlexibleColumnLayoutSemanticHelper} An instance of the semantic helper
		 */
		getHelper: function () {
			var oFCL = this.getRootControl().byId("idFlexibleColumnLayout"),
				oParams = jQuery.sap.getUriParameters(),
				oSettings = {
					defaultTwoColumnLayoutType: sap.f.LayoutType.TwoColumnsMidExpanded,
					defaultThreeColumnLayoutType: sap.f.LayoutType.ThreeColumnsMidExpanded,
					mode: oParams.get("mode"),
					initialColumnsCount: oParams.get("initial"),
					maxColumnsCount: oParams.get("max")
				};

			return FlexibleColumnLayoutSemanticHelper.getInstanceFor(oFCL, oSettings);
		}
		
		
		
		
	});
});