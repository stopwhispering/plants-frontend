sap.ui.define([
	"plants/tagger/ui/customClasses/BaseController",
	'sap/ui/model/Filter',
	'plants/tagger/ui/model/formatter',
	"plants/tagger/ui/customClasses/ImageUtil",
	"plants/tagger/ui/model/ModelsHelper",
	"plants/tagger/ui/customClasses/Util",
	"sap/m/MessageToast",
], function (BaseController, Filter, formatter, ImageUtil, ModelsHelper, Util, MessageToast) {
	"use strict";
	
	return BaseController.extend("plants.tagger.ui.controller.Untagged", {
		formatter: formatter,
		ImageUtil: ImageUtil.getInstance(),
		ModelsHelper: ModelsHelper,

		onInit: function () {
			this._oRouter = this.getOwnerComponent().getRouter();
			this._oLayoutModel = this.getOwnerComponent().getModel();

			// this._oRouter.getRoute("master").attachPatternMatched(this._onPatternMatched, this);
			// this._oRouter.getRoute("detail").attachPatternMatched(this._onPatternMatched, this);
			this._oRouter.getRoute("untagged").attachPatternMatched(this._onPatternMatched, this);

			this._currentPlantId = null;
		},
		
		_onPatternMatched: function (oEvent) {
			// get current plant id
			this._currentPlantId = parseInt(oEvent.getParameter("arguments").plant_id || this.plant_id || "0");

			// this is called when closing untagged view as well
			if(oEvent.getParameter('name') !== 'untagged'){
				return;
			}
			
			// if we haven't loaded untagged images, yet, we do so before generating images model
			if (!this.getOwnerComponent().imagesUntaggedLoaded){
				this._requestUntaggedImages();
			} else {
				// this._setUntaggedPhotos();
			}

		},
		
		handleClose: function () {
			var sNextLayout = this._oLayoutModel.getProperty("/actionButtonsInfo/endColumn/closeColumn");
			this._oRouter.navTo("detail", {layout: sNextLayout, plant_id: this._currentPlantId});
		},

		_requestUntaggedImages: function(){
			//todo use
			// request data from backend
			$.ajax({
				url: Util.getServiceUrl('/plants_tagger/backend/images/'),
				data: {untagged: true},
				context: this,
				async: true
			})
			.done(this._onReceivingUntaggedImages.bind(this))
			.fail(ModelsHelper.getInstance().onReceiveErrorGeneric.bind(this,'Plant Untagged Images (GET)'));	
		},

		_onReceivingUntaggedImages: function(oData, sStatus, oReturnData){
			//todo use
			this.addPhotosToRegistry(oData.ImagesCollection);
			// this.imagesPlantsLoaded.add(plant_id);
			this.resetUntaggedPhotos();
			this.getOwnerComponent().imagesUntaggedLoaded = true;
		},
		
		onPressReApplyUntaggedFilter: function(){
			//triggered by text button to manually filter for untagged images
			// todo maybe better rebuild model
			this.resetUntaggedPhotos();
			// this.applyUntaggedFilter();
		}

	});
}, true);