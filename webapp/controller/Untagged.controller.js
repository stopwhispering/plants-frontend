sap.ui.define([
	"plants/tagger/ui/customClasses/BaseController",
	'sap/ui/model/Filter',
	'plants/tagger/ui/model/formatter',
	"sap/base/Log",
	"sap/m/MessageToast",
	"plants/tagger/ui/customClasses/Util",
	"plants/tagger/ui/customClasses/ImageUtil",
], function (BaseController, Filter, formatter, Log, 
			MessageToast, Util, ImageUtil) {
	"use strict";
	
	return BaseController.extend("plants.tagger.ui.controller.Untagged", {
		formatter: formatter,
		ImageUtil: ImageUtil.getInstance(),

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
		
		applyUntaggedFilter: function(){
			//refilter on untagged images to refresh images list
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
		
		onPressReApplyUntaggedFilter: function(){
			this.applyUntaggedFilter();
		}

	});
}, true);