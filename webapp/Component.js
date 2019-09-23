sap.ui.define([
	"sap/ui/core/UIComponent",
	"sap/ui/Device",
	"plants/tagger/ui/model/models",
	"sap/ui/model/json/JSONModel",
	"sap/f/FlexibleColumnLayoutSemanticHelper",
	"plants/tagger/ui/model/ModelsHelper",
	"plants/tagger/ui/customClasses/MessageUtil",
	"plants/tagger/ui/customClasses/Util"
], function(UIComponent, Device, models, JSONModel, FlexibleColumnLayoutSemanticHelper, ModelsHelper,
		    MessageUtil, Util) {
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
			
			// instantiate message utility class (singleton pattern)
			MessageUtil.getInstance.apply(this);

			// instantiate empty models and name them
			//they are filled in the helper class
			var oPlantsModel = new JSONModel();
			oPlantsModel.setSizeLimit(1000);
			this.setModel(oPlantsModel, 'plants');
			
			var oImagesModel = new JSONModel();
			oImagesModel.setSizeLimit(20000);
			this.setModel(oImagesModel, 'images');

			var oTaxonModel = new JSONModel();
			this.setModel(oTaxonModel, 'taxon');
			
			// the events/measurement model is a special one insofar as we don't load
			// it initially but only in part as we enter a plant's details site
			var oEventsModel = new JSONModel();
			oEventsModel.setProperty('/PlantsEventsDict', {}); // plant names will be keys of that dict
			this.setModel(oEventsModel, 'events');
			
			//use helper class to load data into json models
			//(helper class is used to reload data via button as well)
			var oModelsHelper = ModelsHelper.getInstance(this);
			oModelsHelper.reloadPlantsFromBackend();
			oModelsHelper.reloadImagesFromBackend();
			oModelsHelper.reloadTaxaFromBackend();

			//initialize router
			var oModel = new JSONModel();  //contains the layout 
			this.setModel(oModel);		
			this.getRouter().initialize();
		},
		
		// although root view is defined in manifest, somehow the 
		// BeforeRouteMatched event handler is not triggered without redefining
		// createContent (no idea, why...)
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