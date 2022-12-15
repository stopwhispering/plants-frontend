sap.ui.define([
	"sap/ui/core/UIComponent",
	"plants/tagger/ui/model/models",
	"sap/ui/model/json/JSONModel",
	"sap/f/FlexibleColumnLayoutSemanticHelper",
	"plants/tagger/ui/model/ModelsHelper",
	"plants/tagger/ui/customClasses/MessageUtil",
	"plants/tagger/ui/customClasses/Util",
], function(UIComponent, models, JSONModel, FlexibleColumnLayoutSemanticHelper, ModelsHelper,
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
			
			this.imagesRegistry = {};
			this.imagesRegistryClone = {};
			this.imagesPlantsLoaded = new Set();
			this.imagesUntaggedLoaded = false;
			
			// instantiate message utility class (singleton pattern)
			MessageUtil.getInstance.apply(this);

			// instantiate empty models and name them
			//they are filled in the helper class
			var oPlantsModel = new JSONModel();
			oPlantsModel.setSizeLimit(2000);
			this.setModel(oPlantsModel, 'plants');
			
			var oImagesModel = new JSONModel();
			oImagesModel.setSizeLimit(50000);
			this.setModel(oImagesModel, 'images');
			
			var oUntaggedImagesModel = new JSONModel();
			oUntaggedImagesModel.setSizeLimit(250);
			this.setModel(oUntaggedImagesModel, 'untaggedImages');

			var oTaxonModel = new JSONModel();
			oTaxonModel.setSizeLimit(2000);
			this.setModel(oTaxonModel, 'taxon');
			
			var oProposalKeywordsModel = new JSONModel();
			oTaxonModel.setSizeLimit(2000);
			this.setModel(oProposalKeywordsModel, 'keywords');

			// empty model for filter values (filled upon opening filter dialog)
			this.setModel(new JSONModel(), 'filterValues');
			
			// the events model is a special one insofar as we don't load
			// it initially but only in part as we enter a plant's details site
			var oEventsModel = new JSONModel(); 
			oEventsModel.setProperty('/PlantsEventsDict', {}); // plant ids will be keys of that dict
			this.setModel(oEventsModel, 'events');
			
			var oPropertiesModel = new JSONModel();
			oPropertiesModel.setProperty('/propertiesPlants', {}); // plant ids will be keys of that dict
			this.setModel(oPropertiesModel, 'properties');
			
			var oPropertiesTaxonModel = new JSONModel();
			oPropertiesTaxonModel.setProperty('/propertiesTaxon', {}); // taxon_id will be keys of that dict
			this.setModel(oPropertiesTaxonModel, 'propertiesTaxa');

			//use helper class to load data into json models
			//(helper class is used to reload data via button as well)
			var oModelsHelper = ModelsHelper.getInstance(this);
			oModelsHelper.reloadPlantsFromBackend();
			// oModelsHelper.reloadImagesFromBackend();
			oModelsHelper.reloadTaxaFromBackend();
			oModelsHelper.reloadKeywordProposalsFromBackend();
			oModelsHelper.reloadTraitCategoryProposalsFromBackend();
			oModelsHelper.reloadNurserySourceProposalsFromBackend();
			oModelsHelper.reloadPropertyNamesFromBackend();
			this.oEventsDataClone = {};  // avoid exceptions when saving before any event has been loaded
			this.oPropertiesDataClone = {};

			// settings model
			var oSettingsModel = new JSONModel({preview_image: 'favourite_image'});
			this.setModel(oSettingsModel, 'status');

			//initialize router
			this.setModel(new JSONModel());	 //contains the layout	
			this.getRouter().initialize();

			this.requestUntaggedImages();
		},

		requestUntaggedImages: function(){
			// request data from backend
			$.ajax({
				url: Util.getServiceUrl('images/untagged/'),
				// data: {untagged: true},
				context: this,
				async: true
			})
			// .done(this._onReceivingUntaggedImages.bind(this))
			.done(this._onReceivingUntaggedImages)
			.fail(ModelsHelper.getInstance().onReceiveErrorGeneric.bind(this,'Plant Untagged Images (GET)'));	
		},

		// load untagged images to display number as badge in top row
		_onReceivingUntaggedImages: function(oData, sStatus, oReturnData){
			this.addPhotosToRegistry(oData.ImagesCollection);
			this.resetUntaggedPhotos();
			this.imagesUntaggedLoaded = true;
		},

		addPhotosToRegistry: function(aPhotos){
			// add photos loaded for a plant to the registry if not already loaded with other plant
			// plus add a copy of the photo to a clone registry for getting changed photos when saving 
			aPhotos.forEach((photo) => {
				if (!(photo.path_original in this.imagesRegistry)){
					this.imagesRegistry[photo.path_original] = photo;
					this.imagesRegistryClone[photo.path_original] = Util.getClonedObject(photo);
				}
			});
		},

		resetUntaggedPhotos: function(){
			//(re-)set untagged photos in untagged model
			var aPhotos = Object.entries(this.imagesRegistry).filter(t => (!t[1].plants.length));
			var aPhotos = aPhotos.map(p => p[1]);
			this.getModel('untaggedImages').setProperty('/ImagesCollection',aPhotos);
		},
		
		// although root view is defined in manifest, somehow the 
		// BeforeRouteMatched event handler is not triggered without redefining
		// createContent (no idea, why...; probably because default is async)
		createContent: function () {
			return sap.ui.view({
				viewName: "plants.tagger.ui.view.FlexibleColumnLayout",
				type: "XML",
				// async: true  //=> no direct entry into plant page possible
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