sap.ui.define([
	"plants/tagger/ui/customClasses/BaseController",
	'sap/ui/model/Filter',
	'sap/m/MessageBox',
	'plants/tagger/ui/model/formatter',
	"plants/tagger/ui/customClasses/ImageUtil",
	"plants/tagger/ui/model/ModelsHelper",
	"plants/tagger/ui/customClasses/Util",
	"sap/m/MessageToast",
], function (BaseController, Filter, MessageBox, formatter, ImageUtil, ModelsHelper, Util, MessageToast) {
	"use strict";
	
	return BaseController.extend("plants.tagger.ui.controller.Untagged", {
		formatter: formatter,
		ImageUtil: ImageUtil.getInstance(),
		ModelsHelper: ModelsHelper,

		onInit: function () {
			this._oRouter = this.getOwnerComponent().getRouter();
			this._oLayoutModel = this.getOwnerComponent().getModel();
			this._oRouter.getRoute("untagged").attachPatternMatched(this._onPatternMatched, this);

			this._currentPlantId = null;
			this.getOwnerComponent().getModel('status').setProperty('/untagged_selectable', false);
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
		},

		onToggleSelectManyListMode: function(oEvent){
			var sCurrentType = oEvent.getSource().getType();
			if(sCurrentType === 'Transparent'){
				// set multi-select mode
				oEvent.getSource().setType('Emphasized');
				this.byId('listImagesUntagged').setMode('MultiSelect');
				// we need to save current mode to a model to allow access via expression binding
				this.getView().getModel('status').setProperty('/untagged_selectable', true);

			} else {
				// set default mode
				oEvent.getSource().setType('Transparent');
				this.byId('listImagesUntagged').setMode('None');
				this.getView().getModel('status').setProperty('/untagged_selectable', false);
			}
		},

		onSelectNone: function(oEvent){
			this._resetSelection(this.byId('listImagesUntagged'));
		},

		_resetSelection: function(oList){
			oList.getItems().forEach(function(item) {
				var oCheckBoxCell = item.setSelected(false);
			});
		},

		onSelectAll: function(oEvent){
			this.byId('listImagesUntagged').getItems().forEach(function(item) {
				var oCheckBoxCell = item.setSelected(true);
			});
		},

		onDeleteSelected: function(oEvent){
			var selectedItems = this.byId('listImagesUntagged').getSelectedItems();
			if (selectedItems.length == 0){
				MessageToast.show("Nothing selected.");
				return;
			}

			var bCompact = !!this.getView().$().closest(".sapUiSizeCompact").length;
			MessageBox.confirm(
				"Delete " + selectedItems.length + " images?", {
					icon: MessageBox.Icon.WARNING,
					title: "Delete",
					stretch: false,
					onClose: this._confirmDeleteSelectedImages.bind(this, selectedItems),
					actions: ['Delete', 'Cancel'],
					styleClass: bCompact ? "sapUiSizeCompact" : ""
				}
			);
		},

		_confirmDeleteSelectedImages: function(selectedItems, sAction){
			if(sAction !== 'Delete'){
				return;
			}

			var selectedImages = selectedItems.map(item => item.getBindingContext('untaggedImages').getObject())
			$.ajax({
				url: Util.getServiceUrl('/plants_tagger/backend/images/'),
				type: 'DELETE',
				contentType: "application/json",
				data: JSON.stringify({'images': selectedImages}),
				context: this
				})
				.done(function(data, textStats, jqXHR) {
					// reset selection afterwards to avoid some bug with selected list items for already deleted images
					this._onAjaxDeletedImagesSuccess(data, textStats, jqXHR, selectedImages, this.onSelectNone.apply(this)); } 
					)
				.fail(ModelsHelper.getInstance().onReceiveErrorGeneric.bind(this,'Images (DELETE)'));
			
		}

	});
}, true);