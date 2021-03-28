sap.ui.define([
	"plants/tagger/ui/customClasses/BaseController",
	'sap/ui/model/Filter',
	'plants/tagger/ui/model/formatter',
	"plants/tagger/ui/customClasses/ImageUtil",
	"plants/tagger/ui/model/ModelsHelper",
	"plants/tagger/ui/customClasses/Util",
], function (BaseController, Filter, formatter, ImageUtil, ModelsHelper, Util) {
	"use strict";
	
	return BaseController.extend("plants.tagger.ui.controller.Untagged", {
		formatter: formatter,
		ImageUtil: ImageUtil.getInstance(),
		ModelsHelper: ModelsHelper,

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
		
		// applyUntaggedFilter: function(){
		// 	//refilter on untagged images to refresh images list
		// 	var oListImages = this.getView().byId('listImagesUntagged');

		// 	// create custom filter function
		// 	var oFilter = new Filter({
		// 	    path: 'plants',
		// 	    test: this.filterSubitemsPlantsUntagged.bind(this)
		// 	});
			
		// 	var aFilters = [oFilter];
		// 	var oBinding = oListImages.getBinding("items");
		// 	if(!oBinding){
		// 		this._ = 1;  // set breakpoint here for debugging
		// 	} else {
		// 		oBinding.filter(aFilters);
		// 	}
		// },

		onAfterRendering: function(evt){
			this.oBindingContext = evt.getSource().getBindingContext("plants");
		},
		
		handleClose: function () {
			var sNextLayout = this.oModel.getProperty("/actionButtonsInfo/endColumn/closeColumn");
			this.oRouter.navTo("detail", {layout: sNextLayout, product: this._plant});
		},
		
		_onProductMatched: function (oEvent) {
			this._plant = oEvent.getParameter("arguments").product || this._plant || "0";

			// this is called when closing untagged view as well
			if(oEvent.getParameter('name') !== 'untagged'){
				return;
			}
			// only filter if there's currently no filter, i.e. if site
			// is loaded for the first time
			// if(this.getView().byId('listImagesUntagged').getBinding('items').aFilters.length === 0){
			// 	this.applyUntaggedFilter();
			// }
			
			// todo continue implementation
			// if we haven't loaded untagged images, yet, we do so before generating images model
			
			if (!this.getOwnerComponent().imagesUntaggedLoaded){
				this.requestUntaggedImages();
			} else {
				// this._setUntaggedPhotos();
			}

		},

		requestUntaggedImages: function(){
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